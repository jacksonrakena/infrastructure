package com.jacksonrakena.infrastructure.apps

import com.jacksonrakena.infrastructure.util.applyCommonConfiguration
import com.jacksonrakena.infrastructure.util.kube
import org.cdk8s.Chart
import org.cdk8s.ChartProps
import org.cdk8s.plus28.ContainerPort
import org.cdk8s.plus28.ContainerProps
import org.cdk8s.plus28.Deployment
import org.cdk8s.plus28.DeploymentExposeViaServiceOptions
import org.cdk8s.plus28.DeploymentProps
import org.cdk8s.plus28.DeploymentStrategy
import org.cdk8s.plus28.DockerConfigSecret
import org.cdk8s.plus28.EnvFrom
import org.cdk8s.plus28.HttpGetProbeOptions
import org.cdk8s.plus28.IConfigMap
import org.cdk8s.plus28.Probe
import org.cdk8s.plus28.ServicePort
import software.constructs.Construct
import kotlin.time.Duration.Companion.seconds

class Mixer(
    scope: Construct,
    id: String,
    configMap: IConfigMap,
    registrySecret: DockerConfigSecret,
    props: ChartProps? = null,
) : Chart(scope, id, props) {
    val deployment = Deployment(
        this,
        "deployment",
        DeploymentProps.builder()
            .replicas(1)
            .strategy(
                DeploymentStrategy.recreate()
            )
            .containers(
                listOf(
                    ContainerProps.builder()
                        .name("mixer-api")
                        .applyCommonConfiguration()
                        .image("ghcr.io/jacksonrakena/mixer:latest")
                        .ports(
                            listOf(
                                ContainerPort.builder().number(8080).build()
                            )
                        )
                        .envFrom(
                            listOf(
                                EnvFrom(configMap)
                            )
                        )
                        .liveness(
                            Probe.fromHttpGet(
                                "/actuator/health", HttpGetProbeOptions.builder().initialDelaySeconds(
                                    3.seconds.kube
                                ).periodSeconds(3.seconds.kube).port(8080).build()
                            )
                        )
                        .build()
                )
            )
            .dockerRegistryAuth(registrySecret)
            .build()
    )

    val service = deployment.exposeViaService(
        DeploymentExposeViaServiceOptions.builder()
            .ports(
                listOf(
                    ServicePort.builder().port(80).targetPort(8080).build()
                )
            ).build()
    )
}
