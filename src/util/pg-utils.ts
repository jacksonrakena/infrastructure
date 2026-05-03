import * as fs from "fs";
import * as kplus from "cdk8s-plus-28";
import { Construct } from "constructs";
import { ClusterSpecManagedRoles } from "../../imports/postgresql.cnpg.io";
// Creates a Postgres role and corresponding Kubernetes secret from a properties file
export const createPostgresRoleAndSecret = (scope: Construct, name: string) => {
  const properties = Object.fromEntries(
    fs
      .readFileSync(`secrets/pg-users/${name}.properties`, "utf-8")
      .split("\n")
      .map((line: string) => {
        const [key, value] = line.split("=");
        return [key.trim(), value.trim()];
      }),
  );

  if (!properties.username || !properties.password) {
    throw new Error(
      `Invalid properties file for ${name}: missing username or password`,
    );
  }

  const secret = new kplus.Secret(scope, `pg-role-${name}-secret`, {
    type: "kubernetes.io/basic-auth",
    metadata: {
      labels: {
        "cpng.io/reload": "true",
      },
    },
    stringData: properties,
  });

  return {
    secret: secret,
    role: {
      name: properties.username,
      passwordSecret: {
        name: secret.name,
      },
      login: true,
    } as ClusterSpecManagedRoles,
  };
};
