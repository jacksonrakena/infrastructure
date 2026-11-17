#!/usr/bin/env bash
# Re-vendor the Gateway API standard-channel bundle into charts/gateway-api-crds.
#   scripts/vendor-gateway-api.sh v1.6.1
set -euo pipefail
version="${1:?usage: $0 <version, e.g. v1.6.1>}"
cd "$(dirname "$0")/.."
curl -fsSL -o charts/gateway-api-crds/upstream/standard-install.yaml \
  "https://github.com/kubernetes-sigs/gateway-api/releases/download/${version}/standard-install.yaml"
echo "Vendored ${version}. Now set version/appVersion in charts/gateway-api-crds/Chart.yaml."
