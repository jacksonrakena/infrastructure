package com.jacksonrakena.infrastructure.apps

import com.jacksonrakena.infrastructure.util.applyCommonConfiguration
import org.cdk8s.ApiObjectMetadata
import org.cdk8s.Chart
import org.cdk8s.ChartProps
import org.cdk8s.Duration
import org.cdk8s.plus28.ConfigMap
import org.cdk8s.plus28.ConfigMapProps
import org.cdk8s.plus28.ContainerPort
import org.cdk8s.plus28.ContainerProps
import org.cdk8s.plus28.Deployment
import org.cdk8s.plus28.DeploymentExposeViaServiceOptions
import org.cdk8s.plus28.DeploymentProps
import org.cdk8s.plus28.DeploymentStrategy
import org.cdk8s.plus28.DeploymentStrategyRollingUpdateOptions
import org.cdk8s.plus28.DockerConfigSecret
import org.cdk8s.plus28.EnvFrom
import org.cdk8s.plus28.EnvValue
import org.cdk8s.plus28.HttpGetProbeOptions
import org.cdk8s.plus28.IConfigMap
import org.cdk8s.plus28.PercentOrAbsolute
import org.cdk8s.plus28.Probe
import org.cdk8s.plus28.Service
import org.cdk8s.plus28.ServicePort
import org.cdk8s.plus28.Volume
import org.cdk8s.plus28.VolumeMount
import software.constructs.Construct
import java.nio.file.Files
import java.nio.file.Path
import kotlin.time.Duration.Companion.seconds
import kotlin.time.toDuration

class Blank(
    scope: Construct,
    id: String,
    registrySecret: DockerConfigSecret,
    props: ChartProps? = null,
) : Chart(scope, id, props) {
    val volume = Volume.fromConfigMap(
        this,
        "blank-targets-mount",
        ConfigMap(
            this,
            "blank-targets-config-map",
            ConfigMapProps.builder()
            .metadata(
                ApiObjectMetadata.builder()
                    .name("blank-config")
                    .build()
            )
            .data(
                mapOf(
                    "targets.kdl" to Files.readString(Path.of("secrets/go_targets.kdl"))
                )
            )
            .build()
        )
    )
    val deployment = Deployment(
        this,
        "deployment",
        DeploymentProps.builder()
            .replicas(3)
            .strategy(
                DeploymentStrategy.rollingUpdate(
                    DeploymentStrategyRollingUpdateOptions.builder().maxUnavailable(
                        PercentOrAbsolute.absolute(1)
                    ).build()
                )
            )
            .containers(
                listOf(
                    ContainerProps.builder()
                        .name("server")
                        .image("ghcr.io/jacksonrakena/blank:latest")
                        .applyCommonConfiguration()
                        .ports(
                            listOf(
                                ContainerPort.builder().number(3000).build()
                            )
                        )
                        .volumeMounts(
                            listOf(
                                VolumeMount.builder()
                                    .volume(volume)
                                    .path("targets.kdl")
                                    .subPath("targets.kdl").build()
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
                    ServicePort.builder().port(80).targetPort(3000).build()
                )
            ).build()
    )
}
