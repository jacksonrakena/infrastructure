import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import * as kplus from "cdk8s-plus-28";
import { applyCommonConfiguration } from "../util/container-utils";

export class Vault extends Chart {
  public readonly service: kplus.Service;

  constructor(
    scope: Construct,
    id: string,
    vaultSecret: kplus.ISecret,
    volumeClaim: kplus.PersistentVolumeClaim,
    props?: ChartProps,
  ) {
    super(scope, id, props);

    const vol = kplus.Volume.fromPersistentVolumeClaim(
      this,
      "galahad-pvc-mount",
      volumeClaim,
    );

    const deployment = new kplus.Deployment(this, "vault", {
      replicas: 1,
      strategy: kplus.DeploymentStrategy.recreate(),
      volumes: [vol],
      containers: [
        applyCommonConfiguration({
          name: "vaultwarden",
          image: "docker.io/vaultwarden/server",
          ports: [{ number: 80 }],
          envFrom: [new kplus.EnvFrom(undefined, undefined, vaultSecret)],
          volumeMounts: [
            {
              volume: vol,
              path: "/data",
              subPath: "vaultwarden-data",
              readOnly: false,
            },
          ],
        }),
      ],
    });

    this.service = deployment.exposeViaService({
      ports: [{ port: 80, targetPort: 80 }],
    });
  }
}
