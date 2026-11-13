import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import * as kplus from "cdk8s-plus-34";
import { applyCommonConfiguration } from "../util/container-utils";

export class Homarr extends Chart {
  public readonly service: kplus.Service;

  constructor(
    scope: Construct,
    id: string,
    homarrSecret: kplus.ISecret,
    volumeClaim: kplus.PersistentVolumeClaim,
    // The data volume is ReadWriteOnce, so Homarr must run on the same node
    // as the other workload mounting it.
    colocateWith: kplus.Deployment,
    props?: ChartProps,
  ) {
    super(scope, id, props);

    const vol = kplus.Volume.fromPersistentVolumeClaim(
      this,
      "data-volume",
      volumeClaim,
    );

    // Read-only cluster access for Homarr's Kubernetes integration.
    const serviceAccount = new kplus.ServiceAccount(this, "service-account");
    const clusterRole = new kplus.ClusterRole(this, "cluster-role");
    clusterRole.allow(
      ["get", "list", "watch"],
      kplus.ApiResource.PODS,
      kplus.ApiResource.SERVICES,
      kplus.ApiResource.NODES,
      kplus.ApiResource.NAMESPACES,
      kplus.ApiResource.CONFIG_MAPS,
      kplus.ApiResource.SECRETS,
      kplus.ApiResource.PERSISTENT_VOLUMES,
      kplus.ApiResource.PERSISTENT_VOLUME_CLAIMS,
      kplus.ApiResource.DEPLOYMENTS,
      kplus.ApiResource.DAEMON_SETS,
      kplus.ApiResource.STATEFUL_SETS,
      kplus.ApiResource.INGRESSES,
    );
    clusterRole.allow(
      ["get", "list"],
      kplus.ApiResource.custom({
        apiGroup: "metrics.k8s.io",
        resourceType: "pods",
      }),
      kplus.ApiResource.custom({
        apiGroup: "metrics.k8s.io",
        resourceType: "nodes",
      }),
    );
    clusterRole.bind(serviceAccount);

    const deployment = new kplus.Deployment(this, "deployment", {
      replicas: 1,
      strategy: kplus.DeploymentStrategy.recreate(),
      volumes: [vol],
      serviceAccount,
      automountServiceAccountToken: true,
      containers: [
        applyCommonConfiguration({
          name: "homarr",
          image: "ghcr.io/homarr-labs/homarr:latest",
          ports: [{ number: 7575 }],
          // SECRET_ENCRYPTION_KEY comes from the env-file secret.
          envFrom: [new kplus.EnvFrom(undefined, undefined, homarrSecret)],
          envVariables: {
            ENABLE_KUBERNETES: kplus.EnvValue.fromValue("true"),
          },
          volumeMounts: [
            {
              volume: vol,
              path: "/appdata",
              subPath: "homarr-appdata",
              readOnly: false,
            },
          ],
        }),
      ],
    });

    deployment.scheduling.colocate(colocateWith, {
      topology: kplus.Topology.HOSTNAME,
    });

    this.service = deployment.exposeViaService({
      ports: [{ port: 80, targetPort: 7575 }],
    });
  }
}
