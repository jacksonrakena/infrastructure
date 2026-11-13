import * as path from "path";
import { App } from "cdk8s";
import { Construct } from "constructs";
import {
  DataLayer,
  PlatformLayer,
  PROD_NAMESPACE,
} from "./envs/prod/layers";
import { ProductionStack } from "./envs/prod/production-stack";

// Each layer synthesises to its own folder under dist/ so it can be applied
// separately. Only dist/prod is pruned (see scripts/kube-apply.sh).
const outdir = process.env.CDK8S_OUTDIR ?? "dist";
const layer = (name: string) => new App({ outdir: path.join(outdir, name) });

const platformApp = layer("platform");
const dataApp = layer("data");
const prodApp = layer("prod");

new PlatformLayer(platformApp, "jci");

const data = new DataLayer(dataApp, "jci", { namespace: PROD_NAMESPACE });

// Keep the "jci/production" construct path: generated resource names are
// derived from it, and changing it would rename (recreate) every prod object.
const prodRoot = new Construct(prodApp, "jci");
const production = new ProductionStack(prodRoot, "production", data.storage, {
  namespace: PROD_NAMESPACE,
});

data.addLeode(production.postgresRoles);

platformApp.synth();
dataApp.synth();
prodApp.synth();
