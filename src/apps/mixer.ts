import { Construct } from "constructs";
import { Chart, ChartProps, Duration } from "cdk8s";
import * as kplus from "cdk8s-plus-28";
import { applyCommonConfiguration } from "../util/container-utils";

export class Mixer extends Chart {
  public readonly service: kplus.Service;
  public readonly frontendService: kplus.Service;

  constructor(
    scope: Construct,
    id: string,
    configMap: kplus.IConfigMap,
    registrySecret: kplus.DockerConfigSecret,
    postgresService: kplus.Service,
    props?: ChartProps,
  ) {
    super(scope, id, props);

    const deployment = new kplus.Deployment(this, "backend", {
      replicas: 1,
      strategy: kplus.DeploymentStrategy.recreate(),
      containers: [
        applyCommonConfiguration({
          name: "mixer-api",
          image: "ghcr.io/jacksonrakena/mixer:latest",
          ports: [{ number: 8080 }],
          envFrom: [new kplus.EnvFrom(configMap)],
          envVariables: {
            SPRING_DATASOURCE_URL: kplus.EnvValue.fromValue(
              `jdbc:postgresql://${postgresService.name}/mixer`,
            ),
          },
          liveness: kplus.Probe.fromHttpGet("/actuator/health", {
            initialDelaySeconds: Duration.seconds(10),
            periodSeconds: Duration.seconds(3),
            port: 8080,
          }),
        }),
      ],
      dockerRegistryAuth: registrySecret,
    });

    this.service = deployment.exposeViaService({
      ports: [{ port: 80, targetPort: 8080 }],
    });

    const frontendDeployment = new kplus.Deployment(this, "frontend", {
      replicas: 2,
      containers: [
        applyCommonConfiguration({
          name: "mixer-frontend",
          image: "ghcr.io/jacksonrakena/mixer:latest-frontend",
          ports: [{ number: 3000 }],
          envVariables: {
            API_BASE_URL: kplus.EnvValue.fromValue(
              "https://finance-api.rakena.com.au",
            ),
          },
        }),
      ],
      dockerRegistryAuth: registrySecret,
    });

    this.frontendService = frontendDeployment.exposeViaService({
      ports: [{ port: 80, targetPort: 3000 }],
    });
  }
}
