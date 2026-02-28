import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import * as kplus from "cdk8s-plus-28";
import { applyCommonConfiguration } from "../util/container-utils";

export class Jacksonbot extends Chart {
  constructor(
    scope: Construct,
    id: string,
    configMap: kplus.IConfigMap,
    registrySecret: kplus.DockerConfigSecret,
    postgresService: kplus.Service,
    props?: ChartProps
  ) {
    super(scope, id, props);

    const volume = kplus.Volume.fromConfigMap(
      this,
      "jacksonbot-config-mount",
      configMap
    );

    new kplus.Deployment(this, "deployment", {
      replicas: 1,
      strategy: kplus.DeploymentStrategy.recreate(),
      volumes: [volume],
      containers: [
        applyCommonConfiguration({
          name: "bot",
          image: "ghcr.io/jacksonrakena/jacksonbot:latest",
          ports: [{ number: 80 }],
          volumeMounts: [
            {
              volume,
              path: "/app/jacksonbot.appsettings.json",
              subPath: "jacksonbot.appsettings.json",
            },
          ],
          envVariables: {
            JACKSONBOT_ConnectionStrings__Database: kplus.EnvValue.fromValue(
              `Host=${postgresService.name};UserName=jacksonbot;Password=jacksonbot;Database=jacksonbot`
            ),
          },
        }),
      ],
      dockerRegistryAuth: registrySecret,
    });
  }
}
