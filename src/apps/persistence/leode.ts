import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import { Cluster, Database } from "../../../imports/postgresql.cnpg.io";
import { KubeStorageClass } from "../../k8s";

export class LeodeCluster extends Chart {
  public readonly cluster: Cluster;
  public readonly databases: Database[];
  constructor(
    scope: Construct,
    id: string,
    storageClass: KubeStorageClass,
    props?: ChartProps,
  ) {
    super(scope, id, props);

    this.cluster = new Cluster(this, "leode-cluster", {
      metadata: {
        name: "leode",
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
          roles: [
            {
              name: "gradekeeper",
              login: true,
            },
            {
              name: "mixer",
              login: true,
            },
          ],
        },
      },
    });

    this.databases = ["gradekeeper", "mixer"].map(
      (dbName) =>
        new Database(this, `${dbName}-db`, {
          metadata: {
            name: dbName,
            namespace: this.namespace,
          },
          spec: {
            name: dbName,
            cluster: {
              name: this.cluster.name,
            },
            owner: dbName,
          },
        }),
    );
  }
}
