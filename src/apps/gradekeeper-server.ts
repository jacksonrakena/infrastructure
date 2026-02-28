import { Construct } from "constructs";
import { Chart, ChartProps, Duration } from "cdk8s";
import * as kplus from "cdk8s-plus-28";
import { applyCommonConfiguration } from "../util/container-utils";

export class GradekeeperServer extends Chart {
  public readonly service: kplus.Service;

  constructor(
    scope: Construct,
    id: string,
    configMap: kplus.IConfigMap,
    postgresService: kplus.Service,
    registrySecret: kplus.DockerConfigSecret,
    props?: ChartProps
  ) {
    super(scope, id, props);

    const deployment = new kplus.Deployment(this, "deployment", {
      replicas: 2,
      strategy: kplus.DeploymentStrategy.rollingUpdate({
        maxUnavailable: kplus.PercentOrAbsolute.absolute(1),
      }),
      containers: [
        applyCommonConfiguration({
          name: "server",
          image: "ghcr.io/jacksonrakena/gradekeeper-server:latest",
          ports: [{ number: 3000 }],
          envFrom: [new kplus.EnvFrom(configMap)],
          envVariables: {
            DATABASE_URL: kplus.EnvValue.fromValue(
              `postgresql://gradekeeper:gradekeeper@${postgresService.name}/gradekeeper`
            ),
          },
          liveness: kplus.Probe.fromHttpGet("/health", {
            initialDelaySeconds: Duration.seconds(10),
            port: 3000,
          }),
        }),
      ],
      dockerRegistryAuth: registrySecret,
    });

    this.service = deployment.exposeViaService({
      ports: [{ port: 80, targetPort: 3000 }],
    });
  }
}
