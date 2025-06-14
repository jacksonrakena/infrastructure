package com.jacksonrakena.infrastructure.apps

import com.jacksonrakena.infrastructure.apps.persistence.Galahad
import com.jacksonrakena.infrastructure.util.applyCommonConfiguration
import org.cdk8s.Chart
import org.cdk8s.ChartProps
import org.cdk8s.plus28.ContainerPort
import org.cdk8s.plus28.ContainerProps
import org.cdk8s.plus28.Deployment
import org.cdk8s.plus28.DeploymentExposeViaServiceOptions
import org.cdk8s.plus28.DeploymentProps
import org.cdk8s.plus28.EnvFrom
import org.cdk8s.plus28.EnvValue
import org.cdk8s.plus28.HttpGetProbeOptions
import org.cdk8s.plus28.IConfigMap
import org.cdk8s.plus28.Probe
import org.cdk8s.plus28.ServicePort
import software.constructs.Construct

class Identity(
    scope: Construct,
    id: String,
    configMap: IConfigMap,
    galahad: Galahad,
    props: ChartProps? = null,
) : Chart(scope, id, props) {
    val deployment = Deployment(
        this, "deployment", DeploymentProps.builder().replicas(1).containers(
            listOf(
                ContainerProps.builder().name("keycloak").image("quay.io/keycloak/keycloak:26.0.7")
                    .applyCommonConfiguration().args(listOf("start")).ports(
                        listOf(
                            ContainerPort.builder().number(8080).build()
                        )
                    )
                    .readiness(Probe.fromHttpGet("/health/ready", HttpGetProbeOptions.builder().port(9000).build()))
                    .envFrom(
                        listOf(
                            EnvFrom(configMap)
                        )
                    ).envVariables(
                        mapOf(
                            "KC_DB_URL_HOST" to EnvValue.fromValue(galahad.postgresService.name)
                        )
                    ).build()
            )
        ).build()
    )

    val service = deployment.exposeViaService(
        DeploymentExposeViaServiceOptions.builder().ports(
            listOf(
                ServicePort.builder().port(8080).targetPort(8080).build()
            )
        ).build()
    )
}
