.PHONY: kube build diff apply

# Synthesise dist/platform, dist/data and dist/prod.
build:
	@echo "Building Kubernetes manifest..."
	@npm run build

kube: build

# Show what would change on the cluster, including prod objects that would be pruned.
diff: build
	@scripts/kube-apply.sh diff

# Apply all layers. Pruning anything requires CONFIRM_PRUNE=1.
apply: build
	@scripts/kube-apply.sh apply
