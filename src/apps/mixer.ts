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
      replicas: 3,
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
            SPRING_PROFILES_ACTIVE: kplus.EnvValue.fromValue("prod"),
            SPRINGDOC_API_DOCS_ENABLED: kplus.EnvValue.fromValue("false"),
            SPRINGDOC_SWAGGER_UI_ENABLED: kplus.EnvValue.fromValue("false"),
            MIXER_REFRESH_FX_INITIAL: kplus.EnvValue.fromValue("-1"),
            MIXER_REFRESH_AGGREGATIONS_INITIAL: kplus.EnvValue.fromValue("-1"),
          },
          liveness: kplus.Probe.fromHttpGet("/actuator/health/liveness", {
            initialDelaySeconds: Duration.seconds(20),
            periodSeconds: Duration.seconds(10),
            port: 8080,
          }),
          readiness: kplus.Probe.fromHttpGet("/actuator/health/readiness", {
            initialDelaySeconds: Duration.seconds(20),
            periodSeconds: Duration.seconds(15),
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
      replicas: 3,
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
