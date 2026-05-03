import { Construct } from "constructs";
import { Chart, ChartProps, Include } from "cdk8s";
import * as kplus from "cdk8s-plus-28";
import { ProductionStack } from "./production-stack";

export class ProductionRunner extends Chart {
  constructor(scope: Construct, id: string, props?: ChartProps) {
    super(scope, id, props);

    new Include(this, "cnpg", {
      url: "https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.29/releases/cnpg-1.29.0.yaml",
    });

    new Include(this, "gateway-api", {
      url: "https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.5.1/standard-install.yaml",
    });

    new Include(this, "traefik-rbac", {
      url: "https://raw.githubusercontent.com/traefik/traefik/v3.6.15/docs/content/reference/dynamic-configuration/kubernetes-gateway-rbac.yml",
    });

    const namespace = new kplus.Namespace(this, "prod-namespace", {
      metadata: { name: "prod" },
    });

    new ProductionStack(this, "production", {
      namespace: namespace.name,
    });
  }
}
