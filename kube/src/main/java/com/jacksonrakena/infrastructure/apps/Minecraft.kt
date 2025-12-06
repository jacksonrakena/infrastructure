package com.jacksonrakena.infrastructure.apps

import com.jacksonrakena.infrastructure.util.applyCommonConfiguration
import imports.k8s.IntOrString
import imports.k8s.KubeService
import imports.k8s.KubeServiceProps
import imports.k8s.ObjectMeta
import imports.k8s.ServiceSpec
import org.cdk8s.ApiObjectMetadata
import org.cdk8s.Chart
import org.cdk8s.ChartProps
import org.cdk8s.Size
import org.cdk8s.plus28.ContainerPort
import org.cdk8s.plus28.ContainerProps
import org.cdk8s.plus28.ContainerResources
import org.cdk8s.plus28.ContainerSecurityContextProps
import org.cdk8s.plus28.Cpu
import org.cdk8s.plus28.CpuResources
import org.cdk8s.plus28.Deployment
import org.cdk8s.plus28.DeploymentExposeViaServiceOptions
import org.cdk8s.plus28.DeploymentProps
import org.cdk8s.plus28.DeploymentStrategy
import org.cdk8s.plus28.DockerConfigSecret
import org.cdk8s.plus28.EnvValue
import org.cdk8s.plus28.IConfigMap
import org.cdk8s.plus28.MemoryResources
import org.cdk8s.plus28.PersistentVolume
import org.cdk8s.plus28.PersistentVolumeAccessMode
import org.cdk8s.plus28.PersistentVolumeClaim
import org.cdk8s.plus28.PersistentVolumeClaimProps
import org.cdk8s.plus28.PersistentVolumeClaimVolumeOptions
import org.cdk8s.plus28.Protocol
import org.cdk8s.plus28.Service
import org.cdk8s.plus28.ServicePort
import org.cdk8s.plus28.ServiceType
import org.cdk8s.plus28.Volume
import org.cdk8s.plus28.VolumeMount
import software.constructs.Construct

class Minecraft(
    scope: Construct,
    id: String,
    registrySecret: DockerConfigSecret,
    props: ChartProps? = null,
) : Chart(scope, id, props) {
    val volume = Volume.fromPersistentVolumeClaim(
        this,
        "minecraft-claim",
        PersistentVolumeClaim(
            this,
            "global-data-volume-claim",
            PersistentVolumeClaimProps.builder()
                .metadata(
                    ApiObjectMetadata.builder()
                        .name("minecraft-storage")
                        .build()
                )
                .storageClassName("oci-free")
                .accessModes(
                    listOf(
                        PersistentVolumeAccessMode.READ_WRITE_ONCE
                    )
                )
                .storage(Size.gibibytes(50))
                .build()
        )
    )
//    val deployment = Deployment(
//        this,
//        "deployment",
//        DeploymentProps.builder()
//            .replicas(1)
//            .strategy(
//                DeploymentStrategy.recreate()
//            )
//            .volumes(
//                listOf(
//                    volume
//                )
//            )
//            .podMetadata(ApiObjectMetadata.builder()
//                .labels(mapOf(
//                    "app" to "minecraft"
//                )).build())
//            .containers(
//                listOf(
//                    ContainerProps.builder()
//                        .name("bot")
//                        .image("docker.io/itzg/minecraft-server")
//                        .resources(
//                            ContainerResources.builder()
//                                .cpu(CpuResources.builder().request(Cpu.millis(2000)).limit(Cpu.millis(3500)).build())
//                                .memory(MemoryResources.builder().limit(Size.gibibytes(20)).request(Size.gibibytes(14)).build())
//                                .build()
//                            )
//                        .securityContext(
//                            ContainerSecurityContextProps.builder().readOnlyRootFilesystem(false).ensureNonRoot(false).build()
//                        )
//                        .ports(
//                            listOf(
//                                ContainerPort.builder().number(25565).protocol(Protocol.TCP).build()
//                            )
//                        )
//                        .volumeMounts(
//                            listOf(
//                                VolumeMount.builder()
//                                    .volume(volume)
//                                    .path("/data")
//                                    .subPath("atm9")
//                                    .build()
//                            )
//                        )
//                        .envVariables(
//                            mapOf(
//                                "EULA" to EnvValue.fromValue("TRUE"),
//                                "CF_API_KEY" to EnvValue.fromValue("$2a$10\$ZHze8n.zikPYvZKZTqUpBu7yS7vnvdLZSXy19IOTFh.zSMe0MmSRi"),
//                                "CF_SLUG" to EnvValue.fromValue("all-the-mods-9"),
//                                "MAX_MEMORY" to EnvValue.fromValue("21G"),
//                                "USE_MEOWICE_FLAGS" to EnvValue.fromValue("TRUE"),
//                                "TYPE" to EnvValue.fromValue("AUTO_CURSEFORGE"),
//                                "CF_EXCLUDE_MODS" to EnvValue.fromValue("mekalus-oculus-fork-with-fixed-mekanism-mekasuit,oculus"),
//                                "DIFFICULTY" to EnvValue.fromValue("normal"),
//                                "MOTD" to EnvValue.fromValue("§r                                §e:D"),
//                                "ALLOW_FLIGHT" to EnvValue.fromValue("TRUE")
//                            )
//                        )
//                        .build()
//                )
//            )
//            .dockerRegistryAuth(registrySecret)
//            .build()
//    )
//
//    val service = KubeService(
//        this,
//        "service",
//        KubeServiceProps.builder()
//            .metadata(ObjectMeta.builder().annotations(mapOf(
//                "oci.oraclecloud.com/load-balancer-type" to "nlb"
//            )).build())
//            .spec(ServiceSpec.builder()
//                .type("LoadBalancer")
//                .selector(mapOf(
//                    "app" to "minecraft"
//                ))
//                .ports(
//                    listOf(
//                        imports.k8s.ServicePort.builder().port(25565).protocol(Protocol.TCP.name).targetPort(IntOrString.fromNumber(25565)) .build()
//                    )
//                )
//                .build())
//            .build()
//    )
}
