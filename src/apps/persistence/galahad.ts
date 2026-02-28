import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import * as kplus from "cdk8s-plus-28";
import { applyCommonConfiguration } from "../../util/container-utils";

export class Galahad extends Chart {
  public readonly postgresService: kplus.Service;
  public readonly vaultService: kplus.Service;

  constructor(
    scope: Construct,
    id: string,
    vaultSecret: kplus.ISecret,
    postgresSecret: kplus.ISecret,
    volumeClaim: kplus.PersistentVolumeClaim,
    props?: ChartProps
  ) {
    super(scope, id, props);

    const vol = kplus.Volume.fromPersistentVolumeClaim(
      this,
      "galahad-pvc-mount",
      volumeClaim
    );

    const deployment = new kplus.Deployment(this, "galahad-deployment", {
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
        applyCommonConfiguration({
          name: "postgres",
          image: "docker.io/library/postgres:15",
          ports: [{ number: 5432 }],
          envVariables: {
            POSTGRES_DB: postgresSecret.envValue("db"),
            POSTGRES_USER: postgresSecret.envValue("username"),
            POSTGRES_PASSWORD: postgresSecret.envValue("password"),
          },
          volumeMounts: [
            {
              volume: vol,
              path: "/var/lib/postgresql/data",
              subPath: "pg-data",
              readOnly: false,
            },
          ],
        }),
      ],
    });

    this.postgresService = new kplus.Service(this, "postgres-service", {
      selector: deployment,
      ports: [
        {
          name: "sql",
          protocol: kplus.Protocol.TCP,
          port: 5432,
          targetPort: 5432,
        },
      ],
      type: kplus.ServiceType.CLUSTER_IP,
    });

    this.vaultService = new kplus.Service(this, "vaultwarden-service", {
      selector: deployment,
      ports: [{ name: "web", port: 80, targetPort: 80 }],
      type: kplus.ServiceType.CLUSTER_IP,
    });
  }
}
