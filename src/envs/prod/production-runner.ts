import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import * as kplus from "cdk8s-plus-28";
import { ProductionStack } from "./production-stack";

export class ProductionRunner extends Chart {
  constructor(scope: Construct, id: string, props?: ChartProps) {
    super(scope, id, props);

    const namespace = new kplus.Namespace(this, "prod-namespace", {
      metadata: { name: "prod" },
    });

    new ProductionStack(this, "production", {
      namespace: namespace.name,
    });
  }
}
