import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import * as kplus from "cdk8s-plus-28";
import * as fs from "fs";
import { applyCommonConfiguration } from "../util/container-utils";

export class Blank extends Chart {
  public readonly service: kplus.Service;

  constructor(
    scope: Construct,
    id: string,
    registrySecret: kplus.DockerConfigSecret,
    props?: ChartProps
  ) {
    super(scope, id, props);

    const configMap = new kplus.ConfigMap(this, "blank-targets-config-map", {
      metadata: { name: "blank-config" },
      data: {
        "targets.kdl": fs.readFileSync("secrets/go_targets.kdl", "utf-8"),
      },
    });

    const volume = kplus.Volume.fromConfigMap(
      this,
      "blank-targets-mount",
      configMap
    );

    const deployment = new kplus.Deployment(this, "deployment", {
      replicas: 3,
      strategy: kplus.DeploymentStrategy.rollingUpdate({
        maxUnavailable: kplus.PercentOrAbsolute.absolute(1),
      }),
      containers: [
        applyCommonConfiguration({
          name: "server",
          image: "ghcr.io/jacksonrakena/blank:latest",
          ports: [{ number: 3000 }],
          volumeMounts: [
            {
              volume,
              path: "targets.kdl",
              subPath: "targets.kdl",
            },
          ],
        }),
      ],
      dockerRegistryAuth: registrySecret,
    });

    this.service = deployment.exposeViaService({
      ports: [{ port: 80, targetPort: 3000 }],
    });
  }
}
