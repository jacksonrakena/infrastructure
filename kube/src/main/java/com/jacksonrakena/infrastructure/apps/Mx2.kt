package com.jacksonrakena.infrastructure.apps

import com.jacksonrakena.infrastructure.apps.persistence.Galahad
import com.jacksonrakena.infrastructure.util.applyCommonConfiguration
import org.cdk8s.Chart
import org.cdk8s.ChartProps
import org.cdk8s.Duration
import org.cdk8s.plus28.CommandProbeOptions
import org.cdk8s.plus28.ContainerPort
import org.cdk8s.plus28.ContainerProps
import org.cdk8s.plus28.Deployment
import org.cdk8s.plus28.DeploymentExposeViaServiceOptions
import org.cdk8s.plus28.DeploymentProps
import org.cdk8s.plus28.DeploymentStrategy
import org.cdk8s.plus28.DockerConfigSecret
import org.cdk8s.plus28.EnvFrom
import org.cdk8s.plus28.EnvValue
import org.cdk8s.plus28.ISecret
import org.cdk8s.plus28.Probe
import org.cdk8s.plus28.ServicePort
import software.constructs.Construct

class Mx2(
    scope: Construct,
    id: String,
    registrySecret: DockerConfigSecret,
    galahad: Galahad,
    financeSecret: ISecret,
    props: ChartProps? = null,
) : Chart(scope, id, props) {
    val redis = Deployment(
        this,
        "redis",
        DeploymentProps.builder()
            .replicas(1)
            .strategy(DeploymentStrategy.recreate())
            .containers(
                listOf(
                    ContainerProps.builder()
                        .name("redis")
                        .applyCommonConfiguration()
                        .image("redis:latest")
                        .ports(
                            listOf(
                                ContainerPort.builder().number(6379).build()
                            )
                        )
                        .liveness(
                            Probe.fromCommand(
                                listOf("redis-cli", "ping"),
                                CommandProbeOptions.builder()
                                    .timeoutSeconds(Duration.seconds(5))
                                    .periodSeconds(Duration.seconds(5))
                                    .failureThreshold(5)
                                    .build()
                            )
                        )
                        .build()
                )
            )
            .dockerRegistryAuth(registrySecret)
            .build()
    )
    val redisService = redis.exposeViaService()

    private val common = mapOf(
        "DB_HOST" to EnvValue.fromValue(galahad.postgresService.name),
        "SELF_HOSTED" to EnvValue.fromValue("false"),
        "HOST" to EnvValue.fromValue("0.0.0.0"),
        "REDIS_URL" to EnvValue.fromValue("redis://${redisService.name}:6379/1"),
    )

    val sidekiq = Deployment(
        this,
        "sidekiq",
        DeploymentProps.builder()
            .replicas(1)
            .strategy(DeploymentStrategy.recreate())
            .containers(
                listOf(
                    ContainerProps.builder()
                        .name("sidekiq")
                        .applyCommonConfiguration()
                        .image("ghcr.io/jacksonrakena/finance:latest")
                        .command(listOf("bundle", "exec", "sidekiq"))
                        .ports(
                            listOf(
                                ContainerPort.builder().number(3000).build()
                            )
                        )
                        .envVariables(
                            common
                        )
                        .envFrom(
                            listOf(
                                EnvFrom(null, null, financeSecret)
                            )
                        )
                        .build()
                )
            )
            .dockerRegistryAuth(registrySecret)
            .build()
    )

    val web = Deployment(
        this,
        "web",
        DeploymentProps.builder()
            .replicas(1)
            .strategy(DeploymentStrategy.rollingUpdate())
            .containers(
                listOf(
                    ContainerProps.builder()
                        .name("web")
                        .applyCommonConfiguration()
                        .image("ghcr.io/jacksonrakena/finance:latest")
                        .ports(
                            listOf(
                                ContainerPort.builder().number(3000).build()
                            )
                        )
                        .envVariables(
                            common + mapOf(
                                "RAILS_ENV" to EnvValue.fromValue("production"),
                                "RAILS_SERVE_STATIC_FILES" to EnvValue.fromValue("true"),
                            )
                        )
                        .envFrom(
                            listOf(
                                EnvFrom(null, null, financeSecret)
                            )
                        )
                        .build()
                )
            )
            .dockerRegistryAuth(registrySecret)
            .build()
    )

    val service = web.exposeViaService(
        DeploymentExposeViaServiceOptions.builder()
            .ports(
                listOf(
                    ServicePort.builder().port(80).targetPort(3000).build()
                )
            ).build()
    )
}
