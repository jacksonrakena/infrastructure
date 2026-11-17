# Arthur cluster. Everything is a helmfile release; see helmfile.yaml.gotmpl.
#
#   make diff                    preview every release against the cluster
#   make diff SELECTOR=tier=apps preview a subset (any helmfile selector)
#   make apply                   install/upgrade every release, in dependency order
#   make apply SELECTOR=name=mixer-api
#   make secrets                 edit the encrypted secrets file in $EDITOR
#   make objects                 list every rendered object (no contents)
#   make lint

ENV ?= prod
SELECTOR ?=
HELMFILE := helmfile -e $(ENV)
SELECT := $(if $(SELECTOR),-l $(SELECTOR),)

.PHONY: repos lint objects diff apply secrets

repos:
	@$(HELMFILE) repos

lint: repos
	@$(HELMFILE) $(SELECT) lint

objects: repos
	@$(HELMFILE) $(SELECT) template --skip-tests -q | python3 -I scripts/summarise-manifest.py

diff: repos
	@scripts/diff.sh $(SELECTOR)

apply: repos
	@$(HELMFILE) $(SELECT) sync

secrets:
	@sops environments/$(ENV)/secrets.sops.yaml
