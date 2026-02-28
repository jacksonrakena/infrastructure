import * as kplus from "cdk8s-plus-28";
import { Size } from "cdk8s";

export function applyCommonConfiguration(
  props: kplus.ContainerProps
): kplus.ContainerProps {
  return {
    ...props,
    resources: {
      cpu: {},
      memory: { request: Size.mebibytes(500) },
    },
    securityContext: {
      readOnlyRootFilesystem: false,
      ensureNonRoot: false,
    },
  };
}
