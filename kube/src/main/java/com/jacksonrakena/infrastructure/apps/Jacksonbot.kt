package com.jacksonrakena.infrastructure.apps

import com.jacksonrakena.infrastructure.util.applyCommonConfiguration
import org.cdk8s.Chart
import org.cdk8s.ChartProps
import org.cdk8s.plus28.ContainerPort
import org.cdk8s.plus28.ContainerProps
import org.cdk8s.plus28.Deployment
import org.cdk8s.plus28.DeploymentProps
import org.cdk8s.plus28.DeploymentStrategy
import org.cdk8s.plus28.DockerConfigSecret
import org.cdk8s.plus28.EnvValue
import org.cdk8s.plus28.IConfigMap
import org.cdk8s.plus28.Service
import org.cdk8s.plus28.Volume
import org.cdk8s.plus28.VolumeMount
import software.constructs.Construct

class Jacksonbot(
    scope: Construct,
    id: String,
    configMap: IConfigMap,
    registrySecret: DockerConfigSecret,
    postgresService: Service,
    props: ChartProps? = null,
) : Chart(scope, id, props) {
    val volume = Volume.fromConfigMap(
        this,
        "jacksonbot-config-mount",
        configMap
    )
    val deployment = Deployment(
        this,
        "deployment",
        DeploymentProps.builder()
            .replicas(1)
            .strategy(
                DeploymentStrategy.recreate()
            )
            .volumes(
                listOf(
                    volume
                )
            )
            .containers(
                listOf(
                    ContainerProps.builder()
                        .name("bot")
                        .image("ghcr.io/jacksonrakena/jacksonbot:latest")
                        .applyCommonConfiguration()
                        .ports(
                            listOf(
                                ContainerPort.builder().number(80).build()
                            )
                        )
                        .volumeMounts(
                            listOf(
                                VolumeMount.builder().volume(volume).path("/app/jacksonbot.appsettings.json")
                                    .subPath("jacksonbot.appsettings.json").build()
                            )
                        )
                        .envVariables(
                            mapOf(
                                "JACKSONBOT_ConnectionStrings__Database" to EnvValue.fromValue("Host=${postgresService.name};UserName=jacksonbot;Password=jacksonbot;Database=jacksonbot")
                            )
                        )
                        .build()
                )
            )
            .dockerRegistryAuth(registrySecret)
            .build()
    )
}
