import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import * as kplus from "cdk8s-plus-28";
import {
  KubeClusterRoleBinding,
  KubeDeployment,
  KubeService,
  IntOrString,
} from "../../imports/k8s";
import { GatewayClass } from "../../imports/gateway.networking.k8s.io";

function makeCustomApiResources(
  apiGroup: string,
  resourceTypes: string[],
): kplus.IApiEndpoint[] {
  return resourceTypes.map((rt) =>
    kplus.ApiResource.custom({ apiGroup, resourceType: rt }),
  );
}

export class TraefikStack extends Chart {
  constructor(scope: Construct, id: string, props?: ChartProps) {
    super(scope, id, props);

    const serviceAccount = new kplus.ServiceAccount(
      this,
      "traefik-service-account",
      { automountToken: true },
    );

    const clusterRole = new kplus.ClusterRole(this, "cluster-role", {
      rules: [
        {
          verbs: ["get", "list", "watch"],
          endpoints: [
            kplus.ApiResource.SERVICES,
            kplus.ApiResource.SECRETS,
            kplus.ApiResource.NODES,
            kplus.ApiResource.NAMESPACES,
            kplus.ApiResource.ENDPOINT_SLICES,
            kplus.ApiResource.custom({
              apiGroup: "gateway.networking.k8s.io",
              resourceType: "*",
            }),
          ],
        },
      ],
    });

    new KubeClusterRoleBinding(this, "role-binding", {
      roleRef: {
        apiGroup: clusterRole.apiGroup,
        kind: clusterRole.kind,
        name: clusterRole.name,
      },
      subjects: [
        {
          kind: serviceAccount.kind,
          name: serviceAccount.name,
          namespace: serviceAccount.metadata.namespace,
        },
      ],
    });

    new KubeService(this, "service", {
      metadata: {
        annotations: {
          "oci.oraclecloud.com/load-balancer-type": "nlb",
        },
      },
      spec: {
        type: "LoadBalancer",
        externalTrafficPolicy: "Cluster",
        loadBalancerIp: "158.179.25.151",
        ports: [
          {
            name: "websecure",
            port: 443,
            targetPort: IntOrString.fromString("websecure"),
          },
        ],
        selector: { app: "traefik" },
      },
    });

    new KubeDeployment(this, "deployment", {
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: "traefik" } },
        template: {
          metadata: { labels: { app: "traefik" } },
          spec: {
            serviceAccountName: serviceAccount.name,
            containers: [
              {
                name: "traefik",
                image: "docker.io/library/traefik:v3.4",
                args: [
                  "--entrypoints.websecure.address=:443",
                  "--entrypoints.websecure.http.tls=true",
                  "--providers.kubernetesgateway",
                ],
                ports: [{ name: "websecure", containerPort: 443 }],
              },
            ],
          },
        },
      },
    });
    new GatewayClass(this, "gateway-class", {
      metadata: { name: "traefik-gateway-class", namespace: this.namespace },
      spec: {
        controllerName: "traefik.io/gateway-controller",
      },
    });
  }
}
