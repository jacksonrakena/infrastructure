import { Construct } from "constructs";
import { Chart, ChartProps, Duration } from "cdk8s";
import * as kplus from "cdk8s-plus-34";
import { applyCommonConfiguration } from "../util/container-utils";

const AUTHENTIK_IMAGE = "ghcr.io/goauthentik/server:2026.8.5";

export class Authentik extends Chart {
  public readonly service: kplus.Service;

  constructor(
    scope: Construct,
    id: string,
    authentikSecret: kplus.ISecret,
    databaseServiceReadWrite: string,
    databaseSecret: kplus.ISecret,
    props?: ChartProps,
  ) {
    super(scope, id, props);

    // Shared between server and worker. AUTHENTIK_SECRET_KEY (and any other
    // AUTHENTIK_* overrides, e.g. email) come from the env-file secret.
    const envFrom = [new kplus.EnvFrom(undefined, undefined, authentikSecret)];
    const envVariables: Record<string, kplus.EnvValue> = {
      AUTHENTIK_POSTGRESQL__HOST: kplus.EnvValue.fromValue(
        databaseServiceReadWrite,
      ),
      AUTHENTIK_POSTGRESQL__NAME: kplus.EnvValue.fromValue("authentik"),
      AUTHENTIK_POSTGRESQL__USER: kplus.EnvValue.fromSecretValue({
        key: "username",
        secret: databaseSecret,
      }),
      AUTHENTIK_POSTGRESQL__PASSWORD: kplus.EnvValue.fromSecretValue({
        key: "password",
        secret: databaseSecret,
      }),
      AUTHENTIK_ERROR_REPORTING__ENABLED: kplus.EnvValue.fromValue("false"),
    };

    const server = new kplus.Deployment(this, "server", {
      replicas: 1,
      containers: [
        applyCommonConfiguration({
          name: "authentik-server",
          image: AUTHENTIK_IMAGE,
          args: ["server"],
          ports: [{ number: 9000, name: "http" }],
          envFrom,
          envVariables,
          liveness: kplus.Probe.fromHttpGet("/-/health/live/", {
            port: 9000,
            initialDelaySeconds: Duration.seconds(30),
            periodSeconds: Duration.seconds(10),
          }),
          readiness: kplus.Probe.fromHttpGet("/-/health/ready/", {
            port: 9000,
            initialDelaySeconds: Duration.seconds(30),
            periodSeconds: Duration.seconds(10),
          }),
        }),
      ],
    });

    new kplus.Deployment(this, "worker", {
      replicas: 1,
      containers: [
        applyCommonConfiguration({
          name: "authentik-worker",
          image: AUTHENTIK_IMAGE,
          args: ["worker"],
          envFrom,
          envVariables,
          liveness: kplus.Probe.fromCommand(["ak", "healthcheck"], {
            initialDelaySeconds: Duration.seconds(30),
            periodSeconds: Duration.seconds(30),
          }),
        }),
      ],
    });

    this.service = server.exposeViaService({
      ports: [{ port: 80, targetPort: 9000 }],
    });
  }
}
