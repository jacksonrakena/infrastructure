import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import * as kplus from "cdk8s-plus-28";
import { ProductionCredentials } from "./production-credentials";
import { ProductionBlockStorage } from "./production-block-storage";
import { Galahad } from "../../apps/persistence/galahad";
import { TraefikStack } from "../../traefik/traefik-stack";
import { GradekeeperServer } from "../../apps/gradekeeper-server";
import { Jacksonbot } from "../../apps/jacksonbot";
import { Blank } from "../../apps/blank";
import { loadTlsSecretFromFolder } from "../../util/secret-utils";
import { Mixer } from "../../apps/mixer";

export class ProductionStack extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, props);

    const credentials = new ProductionCredentials(this, "credentials", props);

    const storage = new ProductionBlockStorage(this, id, props);

    const galahad = new Galahad(
      this,
      "galahad",
      credentials.vaultwardenSecret,
      credentials.postgresSecret,
      storage.volumeClaim,
      props,
    );

    new TraefikStack(this, "traefik", props);

    const gks = new GradekeeperServer(
      this,
      "gk-server",
      credentials.gradekeeperConfigMap,
      galahad.postgresService,
      credentials.githubRegistrySecret,
      props,
    );

    const jacksonbot = new Jacksonbot(
      this,
      "jacksonbot",
      credentials.jacksonbotConfigMap,
      credentials.githubRegistrySecret,
      galahad.postgresService,
      props,
    );

    const mixer = new Mixer(
      this,
      "mixer",
      credentials.mixerBackendConfigMap,
      credentials.githubRegistrySecret,
      galahad.postgresService,
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

    new kplus.Ingress(this, "ingress", {
      metadata: {
        annotations: {
          "traefik.ingress.kubernetes.io/router.tls": "true",
          "traefik.ingress.kubernetes.io/router.entrypoints": "websecure",
        },
      },
      tls: [
        {
          secret: rakenaComAuTlsSecret,
          hosts: [
            "id.rakena.com.au",
            "vault.rakena.com.au",
            "finance.rakena.com.au",
          ],
        },
        {
          secret: rakenaCoNzTlsSecret,
          hosts: ["vault.rakena.co.nz"],
        },
        {
          secret: jacksonrakenaComTlsSecret,
          hosts: ["go.jacksonrakena.com"],
        },
      ],
      rules: [
        {
          host: "vault.rakena.com.au",
          pathType: kplus.HttpIngressPathType.PREFIX,
          backend: kplus.IngressBackend.fromService(galahad.vaultService),
        },
        {
          host: "vault.rakena.co.nz",
          pathType: kplus.HttpIngressPathType.PREFIX,
          backend: kplus.IngressBackend.fromService(galahad.vaultService),
        },
        {
          host: "api.gradekeeper.xyz",
          pathType: kplus.HttpIngressPathType.PREFIX,
          backend: kplus.IngressBackend.fromService(gks.service),
        },
        {
          host: "go.jacksonrakena.com",
          pathType: kplus.HttpIngressPathType.PREFIX,
          backend: kplus.IngressBackend.fromService(blank.service),
        },
        {
          host: "finance-api.rakena.com.au",
          pathType: kplus.HttpIngressPathType.PREFIX,
          backend: kplus.IngressBackend.fromService(mixer.service),
        },
        {
          host: "finance.rakena.com.au",
          pathType: kplus.HttpIngressPathType.PREFIX,
          backend: kplus.IngressBackend.fromService(mixer.frontendService),
        },
      ],
    });
  }
}
