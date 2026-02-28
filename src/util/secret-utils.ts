import * as fs from "fs";
import * as path from "path";
import * as kplus from "cdk8s-plus-28";

export function loadTlsSecretFromFolder(
  folderPath: string
): kplus.TlsSecretProps {
  const crt = fs.readFileSync(path.join(folderPath, "tls.crt"), "utf-8");
  const key = fs.readFileSync(path.join(folderPath, "tls.key"), "utf-8");
  return { tlsCert: crt, tlsKey: key };
}
