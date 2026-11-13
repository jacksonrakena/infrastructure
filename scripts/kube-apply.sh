#!/usr/bin/env bash
# Applies the layered manifest in dist/ with server-side apply.
#
#   scripts/kube-apply.sh diff    show changes and what would be pruned; changes nothing
#   scripts/kube-apply.sh apply   apply all layers, pruning removed prod objects
#
# Layers, applied in order:
#   dist/platform  operators, CRDs, namespaces     never pruned
#   dist/data      storage, Leode Postgres cluster never pruned
#   dist/prod      apps, credentials, routing      pruned via the "jci-prod" ApplySet
#
# Pruning only ever deletes objects that a previous apply labelled as members
# of the jci-prod ApplySet, so nothing created outside this repo can be pruned.
# On top of that:
#   - any prune at all needs CONFIRM_PRUNE=1, after reviewing the list printed;
#   - a prune that would delete a protected kind (data or cluster structure)
#     is always refused; move those deletions to a deliberate manual step.
set -euo pipefail

cd "$(dirname "$0")/.."

MODE="${1:-}"
DIST="${DIST:-dist}"
APPLYSET="jci-prod"
PROD_NAMESPACE="prod"
PROTECTED_KINDS_REGEX='^(persistentvolumeclaim|persistentvolume|storageclass|customresourcedefinition|namespace|cluster\.postgresql\.cnpg\.io)$'

export KUBECTL_APPLYSET=true

for layer in platform data prod; do
  if [[ ! -d "$DIST/$layer" ]]; then
    echo "error: $DIST/$layer not found; run 'make build' first" >&2
    exit 1
  fi
done

prod_apply() {
  kubectl apply -f "$DIST/prod" --server-side \
    --prune --applyset="$APPLYSET" --namespace="$PROD_NAMESPACE" "$@"
}

# Prints "<kind>/<name>" for each object the prod apply would prune.
planned_prunes() {
  local out
  if ! out="$(prod_apply --dry-run=server 2>&1)"; then
    echo "$out" >&2
    echo "error: prod dry run failed" >&2
    return 1
  fi
  grep -E ' pruned \(server dry run\)$' <<<"$out" | sed -E 's/ pruned \(server dry run\)$//' || true
}

# Exit code 1 from kubectl diff only means "there are differences". Errors are
# recorded so the remaining layers are still diffed.
DIFF_FAILED=0
layer_diff() {
  local rc=0
  kubectl diff -f "$1" --server-side "${@:2}" || rc=$?
  if [[ $rc -gt 1 ]]; then
    echo "error: kubectl diff failed for $1" >&2
    DIFF_FAILED=1
  fi
}

check_prunes() {
  local prunes="$1" protected=""
  [[ -z "$prunes" ]] && return 0

  while IFS= read -r obj; do
    local kind="${obj%%/*}"
    if [[ "$kind" =~ $PROTECTED_KINDS_REGEX ]]; then
      protected+="  $obj"$'\n'
    fi
  done <<<"$prunes"

  if [[ -n "$protected" ]]; then
    printf 'refusing to prune protected objects:\n%s' "$protected" >&2
    echo "These hold data or cluster structure. Delete them by hand if that is really intended." >&2
    return 1
  fi

  if [[ "${CONFIRM_PRUNE:-}" != "1" ]]; then
    echo "Re-run with CONFIRM_PRUNE=1 to apply and prune the objects above." >&2
    return 1
  fi
}

case "$MODE" in
  diff)
    for layer in platform data; do
      echo "== $layer: changes"
      layer_diff "$DIST/$layer"
    done
    echo "== prod: changes"
    layer_diff "$DIST/prod" --namespace="$PROD_NAMESPACE"
    echo "== prod: would prune"
    prunes="$(planned_prunes)"
    if [[ -n "$prunes" ]]; then sed 's/^/  /' <<<"$prunes"; else echo "  (nothing)"; fi
    exit "$DIFF_FAILED"
    ;;

  apply)
    # Plan the prune before touching anything, so a refused prune applies nothing.
    prunes="$(planned_prunes)"
    if [[ -n "$prunes" ]]; then
      echo "== prod: will prune"
      sed 's/^/  /' <<<"$prunes"
    fi
    check_prunes "$prunes"

    for layer in platform data; do
      echo "== $layer"
      kubectl apply -f "$DIST/$layer" --server-side
    done
    echo "== prod (ApplySet $APPLYSET)"
    prod_apply
    ;;

  *)
    echo "usage: $0 diff|apply" >&2
    exit 2
    ;;
esac
