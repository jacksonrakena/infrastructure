import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import * as kplus from "cdk8s-plus-34";
import * as fs from "fs";

function createStringDataFromFile(fileName: string): Record<string, string> {
  const lines = fs.readFileSync(fileName, "utf-8").split("\n").filter(Boolean);
  const data: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.replace(/\r$/, "");
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      data[trimmed.substring(0, idx)] = trimmed.substring(idx + 1);
    }
  }
  return data;
}

export class ProductionCredentials extends Chart {
  public readonly vaultwardenSecret: kplus.Secret;
  public readonly githubRegistrySecret: kplus.DockerConfigSecret;
  public readonly gradekeeperConfigMap: kplus.IConfigMap;
  public readonly mixerBackendConfigMap: kplus.IConfigMap;

  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, props);

    this.vaultwardenSecret = new kplus.Secret(this, "vault-secret", {
      stringData: createStringDataFromFile("secrets/vaultwarden.env"),
      immutable: false,
    });

    const dockerConfig = JSON.parse(
      fs.readFileSync("secrets/docker-registry-config.json", "utf-8"),
    );
    this.githubRegistrySecret = new kplus.DockerConfigSecret(
      this,
      "gh-secret",
      {
        immutable: false,
        data: dockerConfig,
      },
    );

    this.gradekeeperConfigMap = new kplus.ConfigMap(
      this,
      "gradekeeper-config",
      {
        immutable: false,
        data: createStringDataFromFile("secrets/gradekeeper-server.env"),
      },
    );

    this.mixerBackendConfigMap = new kplus.ConfigMap(
      this,
      "mixer-backend-config",
      {
        immutable: false,
        data: createStringDataFromFile("secrets/mixer.backend.env"),
      },
    );
  }
}
