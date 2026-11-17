# tailscale-crds

The Tailscale operator's CRDs (`upstream/crds.yaml`), vendored from the
`tailscale-operator` chart of the same version. The `tailscale-operator` release
runs with `installCRDs: false`.

They live in their own release because the upstream chart templates its CRDs
without `helm.sh/resource-policy: keep`: uninstalling it would delete every
Connector, ProxyClass and ProxyGroup, including the `mel-arthur-exit` exit node.
Here every CRD is rendered with the keep policy.

To upgrade: `scripts/vendor-tailscale-crds.sh <version>`, bump `version` and
`appVersion` here, and bump the `tailscale-operator` release to the same version.
