package com.jacksonrakena.infrastructure.apps

import com.jacksonrakena.infrastructure.util.applyCommonConfiguration
import org.cdk8s.Chart
import org.cdk8s.ChartProps
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
import org.cdk8s.plus28.IConfigMap
import org.cdk8s.plus28.PercentOrAbsolute
import org.cdk8s.plus28.Service
import org.cdk8s.plus28.ServicePort
import software.constructs.Construct

class GradekeeperServer(
    scope: Construct,
    id: String,
    configMap: IConfigMap,
    postgresService: Service,
    registrySecret: DockerConfigSecret,
    props: ChartProps? = null,
) : Chart(scope, id, props) {
    val deployment = Deployment(
        this,
        "deployment",
        DeploymentProps.builder()
            .replicas(2)
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
                        .image("ghcr.io/jacksonrakena/gradekeeper-server:latest")
                        .applyCommonConfiguration()
                        .ports(
                            listOf(
                                ContainerPort.builder().number(3000).build()
                            )
                        )
                        .envFrom(
                            listOf(
                                EnvFrom(configMap)
                            )
                        )
                        .envVariables(
                            mapOf(
                                "DATABASE_URL" to EnvValue.fromValue("postgresql://gradekeeper:gradekeeper@${postgresService.name}/gradekeeper")
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
