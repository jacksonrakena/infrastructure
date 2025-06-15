.PHONY: kube plan

kube:
	@echo "Building Kubernetes manifest..."
	@cd kube && yarn build

plan:
	@echo "Running Terraform plan..."
	@cd terraform && terraform plan