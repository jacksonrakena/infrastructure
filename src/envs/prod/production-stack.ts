import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import * as kplus from "cdk8s-plus-28";
import { ProductionCredentials } from "./production-credentials";
import { ProductionBlockStorage } from "./production-block-storage";
import { Vault } from "../../apps/vault";
import { TraefikStack } from "../../traefik/traefik-stack";
import { GradekeeperServer } from "../../apps/gradekeeper-server";
import { Blank } from "../../apps/blank";
import { loadTlsSecretFromFolder } from "../../util/secret-utils";
import { Mixer } from "../../apps/mixer";
import { LeodeCluster } from "../../apps/persistence/leode";
import {
  Gateway,
  GatewaySpecListenersAllowedRoutesNamespacesFrom,
  GatewaySpecListenersTlsMode,
  HttpRoute,
  HttpRouteSpecRulesMatchesPathType,
} from "../../../imports/gateway.networking.k8s.io";
import { createPostgresRoleAndSecret } from "../../util/pg-utils";

export class ProductionStack extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, props);

    const credentials = new ProductionCredentials(this, "credentials", props);

    const storage = new ProductionBlockStorage(this, id, props);

    const vault = new Vault(
      this,
      "vault",
      credentials.vaultwardenSecret,
      storage.volumeClaim,
      props,
    );

    const gkRole = createPostgresRoleAndSecret(this, "gradekeeper");
    const mixerRole = createPostgresRoleAndSecret(this, "mixer");
    const leode = new LeodeCluster(
      this,
      "leode",
      storage.ociFreeStorageClass,
      [gkRole, mixerRole].map((e) => e.role),
      props,
    );

    new TraefikStack(this, "traefik", props);

    const gks = new GradekeeperServer(
      this,
      "gk-server",
      credentials.gradekeeperConfigMap,
      leode.services.readWrite,
      gkRole.secret,
      credentials.githubRegistrySecret,
      props,
    );

    const mixer = new Mixer(
      this,
      "mixer",
      credentials.mixerBackendConfigMap,
      credentials.githubRegistrySecret,
      mixerRole.secret,
      props,
    );

    const rakenaComAuTlsSecret = new kplus.TlsSecret(
      this,
      "rakena-com-au-cert",
      loadTlsSecretFromFolder("secrets/cert-rakena.com.au"),
    );
    const rakenaCoNzTlsSecret = new kplus.TlsSecret(
      this,
      "rakena-co-nz-cert",
      loadTlsSecretFromFolder("secrets/cert-rakena.co.nz"),
    );
    const jacksonrakenaComTlsSecret = new kplus.TlsSecret(
      this,
      "jacksonrakena-com-cert",
      loadTlsSecretFromFolder("secrets/cert-jacksonrakena.com"),
    );

    const blank = new Blank(
      this,
      "blank",
      credentials.githubRegistrySecret,
      props,
    );

    const gateway = new Gateway(this, "gateway", {
      metadata: {
        name: "traefik-gateway",
        namespace: this.namespace,
      },
      spec: {
        gatewayClassName: "traefik-gateway-class",
        infrastructure: {
          annotations: {
            "oci.oraclecloud.com/load-balancer-type": "nlb",
          },
        },
        listeners: [
          {
            name: "https-rakenaconz",
            protocol: "HTTPS",
            port: 443,
            hostname: "*.rakena.co.nz",
            tls: {
              mode: GatewaySpecListenersTlsMode.TERMINATE,
              certificateRefs: [rakenaCoNzTlsSecret].map((secret) => ({
                name: secret.name,
                namespace: this.namespace,
              })),
            },
            allowedRoutes: {
              namespaces: {
                from: GatewaySpecListenersAllowedRoutesNamespacesFrom.SAME,
              },
            },
          },
          {
            name: "https-jacksonrakenacom",
            protocol: "HTTPS",
            port: 443,
            hostname: "*.jacksonrakena.com",
            tls: {
              mode: GatewaySpecListenersTlsMode.TERMINATE,
              certificateRefs: [jacksonrakenaComTlsSecret].map((secret) => ({
                name: secret.name,
                namespace: this.namespace,
              })),
            },
            allowedRoutes: {
              namespaces: {
                from: GatewaySpecListenersAllowedRoutesNamespacesFrom.SAME,
              },
            },
          },
          {
            name: "https-rakenacomau",
            protocol: "HTTPS",
            port: 443,
            tls: {
              mode: GatewaySpecListenersTlsMode.TERMINATE,
              certificateRefs: [rakenaComAuTlsSecret].map((secret) => ({
                name: secret.name,
                namespace: this.namespace,
              })),
            },
            allowedRoutes: {
              namespaces: {
                from: GatewaySpecListenersAllowedRoutesNamespacesFrom.SAME,
              },
            },
          },
        ],
      },
    });

    const createRoute = (
      name: string,
      hostname: string,
      service: kplus.Service,
    ) =>
      new HttpRoute(this, name, {
        metadata: {
          name,
          namespace: this.namespace,
        },
        spec: {
          parentRefs: [
            {
              name: "traefik-gateway",
            },
          ],
          hostnames: [hostname],
          rules: [
            {
              matches: [
                {
                  path: {
                    type: HttpRouteSpecRulesMatchesPathType.PATH_PREFIX,
                    value: "/",
                  },
                },
              ],
              backendRefs: [
                {
                  name: service.name,
                  port: service.ports[0].port,
                },
              ],
            },
          ],
        },
      });

    [
      {
        name: "vault-route",
        hostname: "vault.rakena.com.au",
        service: vault.service,
      },
      {
        name: "vault-co-nz-route",
        hostname: "vault.rakena.co.nz",
        service: vault.service,
      },
      {
        name: "gradekeeper-route",
        hostname: "api.gradekeeper.xyz",
        service: gks.service,
      },
      {
        name: "jacksonrakena-route",
        hostname: "go.jacksonrakena.com",
        service: blank.service,
      },
      {
        name: "finance-api-route",
        hostname: "finance-api.rakena.com.au",
        service: mixer.service,
      },
      {
        name: "finance-frontend-route",
        hostname: "finance.rakena.com.au",
        service: mixer.frontendService,
      },
    ].map(({ name, hostname, service }) =>
      createRoute(name, hostname, service),
    );
  }
}
