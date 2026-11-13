import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import {
  Cluster,
  ClusterSpecManagedRoles,
  Database,
} from "../../../imports/postgresql.cnpg.io";
import { KubeStorageClass } from "../../k8s";

export const LEODE_CLUSTER_NAME = "leode";

// Services CloudNativePG creates for the cluster.
export const leodeServices = {
  readAny: `${LEODE_CLUSTER_NAME}-r`,
  readWrite: `${LEODE_CLUSTER_NAME}-rw`,
  readOnly: `${LEODE_CLUSTER_NAME}-ro`,
};

// The Postgres cluster itself. Lives in the data layer, which is never pruned:
// deleting this resource deletes the instance volume (reclaimPolicy: Delete).
export class LeodeCluster extends Chart {
  public readonly cluster: Cluster;

  constructor(
    scope: Construct,
    id: string,
    storageClass: KubeStorageClass,
    roles: ClusterSpecManagedRoles[],
    props?: ChartProps,
  ) {
    super(scope, id, props);

    this.cluster = new Cluster(this, "leode-cluster", {
      metadata: {
        name: LEODE_CLUSTER_NAME,
        namespace: this.namespace,
      },
      spec: {
        instances: 1,
        affinity: {
          enablePodAntiAffinity: true,
          topologyKey: "kubernetes.io/hostname",
        },
        storage: {
          storageClass: storageClass.name,
          size: "50Gi",
        },
        managed: {
          roles: roles,
        },
        monitoring: {
          enablePodMonitor: true,
        },
      },
    });
  }
}

// Per-app databases on Leode. Lives in the prunable prod layer: CNPG's default
// databaseReclaimPolicy is "retain", so removing one here drops the resource
// but keeps the database and its data in Postgres.
export class LeodeDatabases extends Chart {
  public readonly databases: Database[];

  constructor(
    scope: Construct,
    id: string,
    databaseNames: string[],
    props?: ChartProps,
  ) {
    super(scope, id, props);

    this.databases = databaseNames.map(
      (dbName) =>
        new Database(this, `${dbName}-db`, {
          metadata: {
            name: dbName,
            namespace: this.namespace,
          },
          spec: {
            name: dbName,
            cluster: {
              name: LEODE_CLUSTER_NAME,
            },
            owner: dbName,
          },
        }),
    );
  }
}
