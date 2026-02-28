import { App } from "cdk8s";
import { ProductionRunner } from "./envs/prod/production-runner";

const app = new App();
new ProductionRunner(app, "jci");
app.synth();
