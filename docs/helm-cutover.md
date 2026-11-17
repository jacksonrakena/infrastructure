# Cutover: cdk8s → Helm

One-off runbook for moving the Arthur cluster from the old cdk8s manifests
(ApplySet `jci-prod`) to the helmfile releases in this repository. Run it from
this branch, top to bottom. Each phase is safe to stop after.

**What changes**

| | Before (cdk8s) | After (Helm) |
| --- | --- | --- |
| Data: `arthur-global-data` volume, `leode` cluster and its databases, storage classes, namespaces | — | **Adopted in place**, same names, `helm.sh/resource-policy: keep` added |
| CRDs (Gateway API, CloudNativePG, Tailscale) | upstream manifests | **Adopted in place**, unchanged apart from the keep annotation. Tailscale's come from the vendored `tailscale-crds` release, never from the operator chart (whose CRDs have no keep policy) |
| Tailscale operator, `mel-arthur-exit` Connector, GatewayClass, Gateway, HTTPRoutes | — | **Adopted in place** (same names) |
| CloudNativePG operator | `cnpg-controller-manager` | `cnpg-operator` (Helm chart). Old one removed first, so only one ever runs |
| Traefik + NLB | `jci-production-traefik-*` in `prod` | `traefik` in namespace `traefik`. Same IP `158.179.25.151`, node port `32700`, `nlb` annotation |
| Apps, Services, Secrets | `jci-production-*-c8…` | `vaultwarden`, `mixer-api`, `leode-role-mixer`, … (recreated) |

Expected downtime: a few minutes for every site while the NLB is recreated
(phase 3), plus about a minute for Vaultwarden and Homarr (phase 4).

```bash
# Used throughout. --take-ownership adopts objects Helm didn't create;
# --force-conflicts takes field ownership from the old kubectl applies.
ADOPT='--args=--take-ownership --force-conflicts'
```

## Phase 0: prepare

1. **Confirm `158.179.25.151` is a reserved public IP** (OCI console → Networking →
   IP management → Reserved public IPs). Phase 3 deletes and recreates the load
   balancer; an *ephemeral* IP would be lost, and every DNS record would need changing.
2. Back up Leode (no Barman/object-store backups are configured):
   ```bash
   kubectl exec -n prod leode-2 -c postgres -- pg_dumpall > leode-$(date +%F).sql
   ```
   Optionally take an OCI block volume backup of `csi-57c34efd-…` (`arthur-global-data`).
3. Check you can decrypt the secrets (needs the age key):
   ```bash
   sops decrypt environments/prod/secrets.sops.yaml > /dev/null && echo ok
   ```
4. Preview everything: `make diff`. Expected: the platform, data and edge releases
   show only the `keep` annotations, Leode's role secret names, the Gateway listener
   ports 443 → 8443 and new certificate secret names. Everything else is new.

## Phase 1: platform (no downtime)

```bash
# Stop the old CloudNativePG operator so the chart's operator is the only one.
# Running Postgres instances are unaffected while no operator runs.
kubectl delete deployment -n cnpg-system cnpg-controller-manager

helmfile -e prod -l name=gateway-api-crds -l name=cluster-config sync "$ADOPT"
helmfile -e prod -l name=cnpg sync "$ADOPT"
kubectl get pods -n cnpg-system          # cnpg-operator Running
```

## Phase 2: secrets, Tailscale, data (no downtime)

```bash
helmfile -e prod -l name=secrets sync "$ADOPT"        # adopts tailscale/operator-oauth
helmfile -e prod -l name=tailscale-crds -l name=tailscale-operator -l name=tailscale-config sync "$ADOPT"
helmfile -e prod -l name=data sync "$ADOPT"

# Leode now reads role passwords from leode-role-* (same values). Expect all
# three roles reconciled and no errors:
kubectl get cluster -n prod leode -o jsonpath='{.status.managedRolesStatus}{"\n"}'
kubectl get cluster -n prod leode    # STATUS: Cluster in healthy state
```

## Phase 3: ingress (downtime starts)

```bash
# Old Traefik and its NLB. The service's finalizer waits for OCI to delete the NLB;
# the reserved IP and node port are released when it's gone.
kubectl delete -n prod deployment/jci-production-traefik-deployment-c8e3d626 \
  service/jci-production-traefik-service-c845f22b --wait

# --take-ownership adopts the existing traefik-gateway-class GatewayClass.
helmfile -e prod -l name=traefik sync "$ADOPT"
kubectl get svc -n traefik traefik      # EXTERNAL-IP includes 158.179.25.151

# Gateway listeners move to the websecure entrypoint port (8443) and new cert secrets.
helmfile -e prod -l name=gateway sync "$ADOPT"
kubectl get gateway -n prod traefik-gateway   # PROGRAMMED True
curl -sI https://finance.rakena.com.au | head -1
```

Sites are back once the Gateway is programmed. The HTTPRoutes still point at the
old Services until phase 4.

## Phase 4: apps

```bash
# Leode allows 100 connections (Postgres default), which the old and new
# generations of every database client together exceed. So swap one app at a
# time, retiring the old Deployment as soon as the new one is up. Adopting each
# HTTPRoute (same names) is what moves its traffic to the new Service.
helmfile -e prod -l name=gradekeeper sync "$ADOPT"
kubectl scale -n prod deployment/jci-production-gk-server-deployment-c8191ee5 --replicas=0
helmfile -e prod -l name=mixer-api sync "$ADOPT"
kubectl scale -n prod deployment/jci-production-mixer-backend-c8b1dd4b --replicas=0
helmfile -e prod -l name=mixer-frontend -l name=blank sync "$ADOPT"
kubectl scale -n prod deployment/jci-production-mixer-frontend-c801f36a \
  deployment/jci-production-blank-deployment-c8038c78 --replicas=0

# Authentik: stop the old one first (two workers would also run every task
# twice), and remove its route; the chart's route is named authentik-server.
kubectl scale -n prod deployment/jci-production-authentik-server-c86bc6e3 \
  deployment/jci-production-authentik-worker-c899e268 --replicas=0
kubectl delete httproute -n prod authentik-route
helmfile -e prod -l name=authentik sync "$ADOPT"

# Vaultwarden and Homarr write to files on a ReadWriteOnce volume: stop the old
# pods before the new ones start (about a minute of downtime for both).
kubectl scale -n prod deployment/jci-production-vault-c82037ca \
  deployment/jci-production-homarr-deployment-c8a27de5 --replicas=0
kubectl wait -n prod --for=delete pod -l 'cdk8s.io/metadata.addr in (jci-production-vault-c8ed5b56,jci-production-homarr-deployment-c8a17010)' --timeout=120s
helmfile -e prod -l name=vaultwarden -l name=homarr sync "$ADOPT"
```

Check each site: vault.rakena.com.au, vault.rakena.co.nz, home.rakena.com.au,
api.gradekeeper.xyz, finance.rakena.com.au, finance-api.rakena.com.au,
go.jacksonrakena.com, id.rakena.com.au.

## Phase 5: remove the old objects

Nothing below holds data: volumes, the Leode cluster and its databases were adopted.
Review each list before deleting.

```bash
APPLYSET=applyset.kubernetes.io/part-of=applyset-SA_Ov9yUYr1aiEdlzfg9za9v300Elb0oSKTNEY2hJNs-v1

# 1. Old cdk8s workloads, services, secrets and config in prod. Restricted to
#    kinds Helm did not adopt (adopted Gateway/HTTPRoutes/Databases still carry
#    the label, so never delete by the label alone).
kubectl get -n prod deployment,service,secret,configmap,serviceaccount -l "$APPLYSET"
kubectl delete -n prod deployment,service,secret,configmap,serviceaccount -l "$APPLYSET"

# 2. Old cluster-scoped RBAC: cdk8s Traefik/Homarr, the upstream Traefik Gateway
#    RBAC include, and the old CloudNativePG manifest's roles.
kubectl delete clusterrolebinding jci-production-traefik-role-binding-c8a527ae \
  produc-homarr-cluster-role-clusterrolebinding-c8d2c796 traefik-role-binding \
  cnpg-manager-rolebinding
kubectl delete clusterrole jci-production-homarr-cluster-role-c8fe2361 \
  jci-production-traefik-cluster-role-c80f9944 traefik-role cnpg-manager \
  cnpg-database-editor-role cnpg-database-viewer-role \
  cnpg-publication-editor-role cnpg-publication-viewer-role \
  cnpg-subscription-editor-role cnpg-subscription-viewer-role
kubectl delete serviceaccount -n cnpg-system cnpg-manager

# 3. Retire the ApplySet: drop its membership label from adopted objects, then
#    its parent secret.
kubectl label -n prod gateway,httproute,database.postgresql.cnpg.io --all "${APPLYSET%%=*}-"
kubectl label gatewayclass traefik-gateway-class "${APPLYSET%%=*}-"
kubectl delete secret -n prod jci-prod
```

`secret/jci-production-credentials-pg-secret-c8bb2f73` in `prod` predates the
ApplySet and isn't referenced by anything. Delete it too if you agree.

## Phase 6: verify

```bash
make diff        # every release: (no changes)
helm list -A     # 16 releases, all deployed
```

Then merge this branch. Once you're happy, delete the plaintext `secrets/`
folder and `scripts/import-legacy-secrets.py`. Everything they held is in
`environments/prod/secrets.sops.yaml`.

## If a release gets stuck

A `helmfile sync` that is interrupted (Ctrl-C) leaves its release in
`pending-install` or `pending-upgrade`, and every later sync of it fails.

- **Never `helm uninstall` or `helmfile destroy` a release to unstick it** during the
  cutover: it deletes every object in the release that lacks
  `helm.sh/resource-policy: keep`, including ones it adopted, such as the Tailscale
  operator, the Gateway and the HTTPRoutes.
- If the release has **no deployed revision** (first install), drop Helm's record of it,
  which deletes no Kubernetes objects, then sync again:
  ```bash
  helm history -n <namespace> <release>          # only one revision, pending/failed
  kubectl delete secret -n <namespace> sh.helm.release.v1.<release>.v1
  helmfile -e prod -l name=<release> sync "$ADOPT"
  ```
- If it has a deployed revision: `helm rollback -n <namespace> <release>`, then sync.

## Rolling back

Until phase 5 every old object still exists, and adopted objects are the same
objects (nothing was recreated), so there is little to undo. Don't re-run `main`'s
`make apply`: it doesn't force field conflicts, so it fails on anything Helm now owns.

- **Phase 1 (CloudNativePG):** `helmfile -e prod -l name=cnpg destroy` (its CRDs are kept),
  then reinstall the old operator with
  `kubectl apply --server-side --force-conflicts -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.30/releases/cnpg-1.30.1.yaml`.
- **Phase 2:** the old `jci-production-pg-role-*` secrets still exist with the same
  passwords; nothing depends on the new ones yet except Leode, which accepts either.
- **Phase 3:** if the new Traefik can't get the IP, `helmfile -e prod -l name=traefik destroy`
  and recreate the old Service and Deployment from `main` with
  `make build && kubectl apply --server-side --force-conflicts -f dist/prod`
  (scale the new apps to 0 first if phase 4 has started).
- **Phase 4:** scale the old `jci-production-*` deployments back up and
  `helmfile -e prod -l name=<app> destroy` the new one.
