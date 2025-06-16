package com.jacksonrakena.infrastructure.apps.persistence

import com.jacksonrakena.infrastructure.util.applyCommonConfiguration
import org.cdk8s.Chart
import org.cdk8s.ChartProps
import org.cdk8s.plus28.ContainerPort
import org.cdk8s.plus28.ContainerProps
import org.cdk8s.plus28.Deployment
import org.cdk8s.plus28.DeploymentExposeViaServiceOptions
import org.cdk8s.plus28.DeploymentProps
import org.cdk8s.plus28.EnvValue
import org.cdk8s.plus28.ImagePullPolicy
import org.cdk8s.plus28.ServiceType
import software.constructs.Construct

class Bouncer(
    scope: Construct,
    id: String,
    galahad: Galahad,
    props: ChartProps? = null,
) : Chart(scope, id, props) {
    val deployment = Deployment(
        this,
        "deployment",
        DeploymentProps.builder()
            .replicas(2)
            .containers(
                listOf(
                    ContainerProps.builder()
                        .name("pgbouncer")
                        .image("bitnami/pgbouncer")
                        .imagePullPolicy(ImagePullPolicy.IF_NOT_PRESENT)
                        .ports(
                            listOf(
                                ContainerPort.builder().name("tcp").number(6432).build()
                            )
                        )
                        .applyCommonConfiguration()
                        .envVariables(
                            mapOf(
                                "POSTGRESQL_HOST" to EnvValue.fromValue(galahad.postgresService.name),
                                "PGBOUNCER_DATABASE" to EnvValue.fromValue("mx"),
                                "PGBOUNCER_AUTH_QUERY" to EnvValue.fromValue("SELECT p_user, p_password FROM public.lookup($1)"),
                                "POSTGRESQL_PASSWORD" to EnvValue.fromValue("pgbouncer"),
                                "PGBOUNCER_PORT" to EnvValue.fromValue("6432"),
                                "PGBOUNCER_POOL_MODE" to EnvValue.fromValue("transaction"),
                                "POSTGRESQL_USERNAME" to EnvValue.fromValue("pgbouncer"),
                                "PGBOUNCER_AUTH_USER" to EnvValue.fromValue("pgbouncer"),
                                "PGBOUNCER_MAX_PREPARED_STATEMENTS" to EnvValue.fromValue("10")
                            )
                        )
                        .build()
                )
            )
            .build()
    )
    val service = deployment.exposeViaService(
        DeploymentExposeViaServiceOptions.builder().serviceType(ServiceType.CLUSTER_IP).build()
    )
}