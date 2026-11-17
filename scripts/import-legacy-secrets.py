#!/usr/bin/env python3
"""One-off: convert the legacy plaintext secrets/ folder (used by the old cdk8s
build) into the JSON document that becomes environments/prod/secrets.sops.yaml.

Parsing mirrors the old cdk8s loaders exactly so values are byte-identical:
  *.env         key=value lines, split on the first '=' (production-credentials.ts)
  *.properties  split on '=' and keep the second field    (pg-utils.ts)

Prints JSON to stdout; pipe it straight into `sops encrypt`, never to a file.
The Tailscale OAuth client is read from the live `operator-oauth` secret.
"""
import base64, json, pathlib, subprocess, sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "secrets")

def env_file(name):
    data = {}
    for line in (root / name).read_text().split("\n"):
        line = line.rstrip("\r")
        idx = line.find("=")
        if line and idx > 0:
            data[line[:idx]] = line[idx + 1:]
    return data

def properties(name):
    props = {}
    for line in (root / "pg-users" / f"{name}.properties").read_text().split("\n"):
        parts = line.split("=")
        props[parts[0].strip()] = parts[1].strip()
    assert props.get("username") and props.get("password"), name
    return props

def tls(domain):
    d = root / f"cert-{domain}"
    return {"crt": (d / "tls.crt").read_text(), "key": (d / "tls.key").read_text()}

oauth = json.loads(subprocess.check_output(
    ["kubectl", "get", "secret", "-n", "tailscale", "operator-oauth", "-o", "json"]))["data"]

doc = {
    "tls": {
        "rakena-com-au": tls("rakena.com.au"),
        "rakena-co-nz": tls("rakena.co.nz"),
        "jacksonrakena-com": tls("jacksonrakena.com"),
    },
    "registry": {
        # Same serialisation as cdk8s-plus DockerConfigSecret (JSON.stringify).
        "ghcr": json.dumps(json.loads((root / "docker-registry-config.json").read_text()),
                           separators=(",", ":")),
    },
    "postgresRoles": {n: properties(n) for n in ("gradekeeper", "mixer", "authentik")},
    "env": {
        "vaultwarden": env_file("vaultwarden.env"),
        "gradekeeper": env_file("gradekeeper-server.env"),
        "mixer": env_file("mixer.backend.env"),
        "homarr": env_file("homarr.env"),
        "authentik": env_file("authentik.env"),
    },
    "blankTargets": (root / "go_targets.kdl").read_text(),
    "tailscaleOAuth": {k: base64.b64decode(v).decode() for k, v in oauth.items()},
}
json.dump(doc, sys.stdout)
