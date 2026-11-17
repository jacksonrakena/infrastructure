#!/usr/bin/env bash
# Re-vendor the Tailscale operator CRDs into charts/tailscale-crds, from the
# tailscale-operator chart version the helmfile pins.
#   scripts/vendor-tailscale-crds.sh 1.104.7
set -euo pipefail
version="${1:?usage: $0 <tailscale-operator chart version, e.g. 1.104.7>}"
cd "$(dirname "$0")/.."
helm repo add tailscale https://pkgs.tailscale.com/helmcharts >/dev/null 2>&1 || true
helm repo update tailscale >/dev/null
helm template crds tailscale/tailscale-operator --version "$version" --set installCRDs=true \
  | python3 -I -c '
import re, sys
docs = [d for d in sys.stdin.read().split("\n---") if re.search(r"^kind: CustomResourceDefinition$", d, re.M)]
sys.stdout.write("".join("---" + d.rstrip() + "\n" for d in docs))
print(f"{len(docs)} CRDs", file=sys.stderr)' \
  > charts/tailscale-crds/upstream/crds.yaml
echo "Vendored ${version}. Now set version/appVersion in charts/tailscale-crds/Chart.yaml"
echo "and the tailscale-operator release version in helmfile.yaml.gotmpl to match."
