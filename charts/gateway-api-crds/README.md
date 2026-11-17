# gateway-api-crds

Vendored copy of the Gateway API standard-channel bundle
(`upstream/standard-install.yaml`, from the GitHub release of the same version as
`appVersion`). Gateway API publishes no Helm chart, so this wraps the bundle.

Every object is rendered with `helm.sh/resource-policy: keep`: removing this
release (or an object from the bundle) never deletes a CRD, which would delete
every Gateway and HTTPRoute in the cluster.

To upgrade, run `scripts/vendor-gateway-api.sh <version>` and bump `version` and
`appVersion` in `Chart.yaml`.
