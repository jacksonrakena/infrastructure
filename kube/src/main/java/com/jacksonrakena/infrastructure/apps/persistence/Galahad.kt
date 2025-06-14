package com.jacksonrakena.infrastructure.apps.persistence

import com.jacksonrakena.infrastructure.util.applyCommonConfiguration
import org.cdk8s.Chart
import org.cdk8s.ChartProps
import org.cdk8s.plus28.ContainerPort
import org.cdk8s.plus28.ContainerProps
import org.cdk8s.plus28.Deployment
import org.cdk8s.plus28.DeploymentProps
import org.cdk8s.plus28.DeploymentStrategy
import org.cdk8s.plus28.EnvFrom
import org.cdk8s.plus28.ISecret
import org.cdk8s.plus28.PersistentVolumeClaim
import org.cdk8s.plus28.Protocol
import org.cdk8s.plus28.Service
import org.cdk8s.plus28.ServicePort
import org.cdk8s.plus28.ServiceProps
import org.cdk8s.plus28.ServiceType
import org.cdk8s.plus28.Volume
import org.cdk8s.plus28.VolumeMount
import software.constructs.Construct

class Galahad(
    scope: Construct,
    id: String,
    vaultSecret: ISecret,
    postgresSecret: ISecret,
    volumeClaim: PersistentVolumeClaim,
    props: ChartProps? = null,
) : Chart(scope, id, props) {
    val vol = Volume.fromPersistentVolumeClaim(this, "galahad-pvc-mount", volumeClaim)
    val deployment = Deployment(
        this,
        "galahad-deployment",
        DeploymentProps.builder()
            .replicas(1)
            .strategy(DeploymentStrategy.recreate())
            .volumes(listOf(vol))
            .containers(
                listOf(
                    ContainerProps.builder()
                        .name("vaultwarden")
                        .image("vaultwarden/server")
                        .applyCommonConfiguration()
                        .ports(
                            listOf(
                                ContainerPort.builder().number(80).build()
                            )
                        )
                        .envFrom(
                            listOf(
                                EnvFrom(null, null, vaultSecret)
                            )
                        )
                        .volumeMounts(
                            listOf(
                                VolumeMount.builder()
                                    .volume(vol)
                                    .readOnly(false)
                                    .path("/data")
                                    .subPath("vaultwarden-data")
                                    .build()
                            )
                        )
                        .build(),
                    ContainerProps.builder()
                        .name("postgres")
                        .image("postgres:15")
                        .applyCommonConfiguration()
                        .ports(
                            listOf(
                                ContainerPort.builder().number(5432).build()
                            )
                        )
                        .envVariables(
                            mapOf(
                                "POSTGRES_DB" to postgresSecret.envValue("db"),
                                "POSTGRES_USER" to postgresSecret.envValue("username"),
                                "POSTGRES_PASSWORD" to postgresSecret.envValue("password")
                            )
                        )
                        .volumeMounts(
                            listOf(
                                VolumeMount.builder()
                                    .volume(vol)
                                    .readOnly(false)
                                    .path("/var/lib/postgresql/data")
                                    .subPath("pg-data")
                                    .build()
                            )
                        )
                        .build()
                )
            )
            .build()
    )

    val postgresService = Service(
        this,
        "postgres-service",
        ServiceProps.builder()
            .selector(deployment)
            .ports(
                listOf(
                    ServicePort.builder().name("sql").protocol(Protocol.TCP).port(5432).targetPort(5432).build()
                )
            )
            .type(ServiceType.CLUSTER_IP)
            .build()
    )

    val vaultService = Service(
        this,
        "vaultwarden-service",
        ServiceProps.builder()
            .selector(deployment)
            .ports(
                listOf(
                    ServicePort.builder().name("web").port(80).targetPort(80).build()
                )
            )
            .type(ServiceType.CLUSTER_IP)
            .build()
    )
}