#!/usr/bin/env bash
# Show what `make apply` would change on the cluster, release by release.
# Changes nothing.
#
#   scripts/diff.sh                 every release
#   scripts/diff.sh tier=apps       releases matching a helmfile selector
#
# Each release is rendered with `helmfile template` and compared with
# `kubectl diff --server-side` as Helm's field manager (scripts/kube-diff.py), so
# the diff matches what Helm 4's server-side apply would do. kubectl masks
# Secret data in the output.
# Rendered manifests are piped, never written to disk, because they contain
# decrypted secrets.
#
# Not shown: objects Helm would delete because they were removed from a chart.
# (`helm diff` shows those, but the plugin can't be installed with signature
# verification under Helm 4.)
set -euo pipefail
cd "$(dirname "$0")/.."

ENV="${HELMFILE_ENV:-prod}"
selector=()
[[ $# -gt 0 ]] && selector=(-l "$1")

# List releases first so a helmfile error stops the script instead of silently
# diffing nothing. ${arr[@]+...} keeps bash 3.2 (macOS) happy under set -u.
releases="$(helmfile -e "$ENV" ${selector[@]+"${selector[@]}"} list --output json \
  | python3 -I -c 'import json,sys
d = sys.stdin.read()
for r in (json.loads(d) if d.strip() else []): print(r["name"], r["namespace"], sep="\t")')"
if [[ -z "$releases" ]]; then
  echo "error: no releases matched" >&2
  exit 1
fi

status=0
while IFS=$'\t' read -r name namespace; do
  echo "=== $namespace/$name"
  rc=0
  helmfile -e "$ENV" -l "name=$name" template --skip-tests --skip-deps -q 2>/dev/null \
    | python3 -I scripts/kube-diff.py "$namespace" "$name" \
    || rc=$?
  # kubectl diff exits 1 when there are differences, >1 on error.
  if [[ $rc -gt 1 ]]; then
    echo "error: diff failed for $namespace/$name" >&2
    status=1
  elif [[ $rc -eq 0 ]]; then
    echo "  (no changes)"
  fi
done <<<"$releases"

exit "$status"
