import { Construct } from "constructs";
import { Chart, ChartProps, Include, JsonPatch } from "cdk8s";
import * as kplus from "cdk8s-plus-34";
import { ProductionBlockStorage } from "./production-block-storage";
import { LeodeCluster } from "../../apps/persistence/leode";
import { ClusterSpecManagedRoles } from "../../../imports/postgresql.cnpg.io";

export const PROD_NAMESPACE = "prod";

// Overrides a container's image and env values in an included Deployment.
// Throws if the Deployment, container or env var is missing, so an upstream
// manifest change can't silently drop the override.
function pinContainerImages(
  include: Include,
  deploymentName: string,
  containerName: string,
  pins: { image?: string; env?: Record<string, string> },
) {
  const deployment = include.apiObjects.find(
    (o) => o.kind === "Deployment" && o.name === deploymentName,
  );
  if (!deployment) {
    throw new Error(`Included Deployment "${deploymentName}" not found`);
  }
  const containers: { name: string; env?: { name: string }[] }[] =
    deployment.toJson().spec.template.spec.containers;
  const ci = containers.findIndex((c) => c.name === containerName);
  if (ci < 0) {
    throw new Error(`Container "${containerName}" not found in "${deploymentName}"`);
  }
  const base = `/spec/template/spec/containers/${ci}`;
  if (pins.image) {
    deployment.addJsonPatch(JsonPatch.replace(`${base}/image`, pins.image));
  }
  for (const [name, value] of Object.entries(pins.env ?? {})) {
    const ei = (containers[ci].env ?? []).findIndex((e) => e.name === name);
    if (ei < 0) {
      throw new Error(`Env "${name}" not found in "${deploymentName}/${containerName}"`);
    }
    deployment.addJsonPatch(JsonPatch.replace(`${base}/env/${ei}/value`, value));
  }
}

// Platform layer: upstream operators, CRDs and namespaces. Applied with
// server-side apply but never pruned. Removing a CRD deletes every resource of
// that type, so anything leaving this layer is removed by hand, deliberately.
export class PlatformLayer extends Chart {
  constructor(scope: Construct, id: string, props?: ChartProps) {
    super(scope, id, props);

    new Include(this, "cnpg", {
      url: "https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.30/releases/cnpg-1.30.1.yaml",
    });

    new Include(this, "gateway-api", {
      url: "https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.6.1/standard-install.yaml",
    });

    new Include(this, "traefik-rbac", {
      url: "https://raw.githubusercontent.com/traefik/traefik/v3.7.13/docs/content/reference/dynamic-configuration/kubernetes-gateway-rbac.yml",
    });

    const tailscale = new Include(this, "tailscale", {
      url: "https://raw.githubusercontent.com/tailscale/tailscale/refs/tags/v1.104.7/cmd/k8s-operator/deploy/manifests/operator.yaml",
    });
    // Match the images the operator is actually running on the cluster.
    pinContainerImages(tailscale, "operator", "operator", {
      image: "docker.io/tailscale/k8s-operator",
      env: { PROXY_IMAGE: "docker.io/tailscale/tailscale:stable" },
    });

    new kplus.Namespace(this, "prod-namespace", {
      metadata: { name: PROD_NAMESPACE },
    });
  }
}

// Data layer: storage and the Postgres cluster. Applied with server-side apply
// but never pruned, because deleting these destroys data.
export class DataLayer extends Chart {
  public readonly storage: ProductionBlockStorage;

  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, props);
    this.storage = new ProductionBlockStorage(this, "storage", props);
  }

  // Leode's managed roles come from the prod layer, which needs this layer's
  // storage first, so the cluster is added once the prod layer exists.
  addLeode(roles: ClusterSpecManagedRoles[]): LeodeCluster {
    return new LeodeCluster(
      this,
      "leode",
      this.storage.ociFreeTransientStorageClass,
      roles,
      { namespace: this.namespace },
    );
  }
}
