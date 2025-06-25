package com.jacksonrakena.infrastructure.envs.prod

import imports.k8s.KubeStorageClass
import imports.k8s.KubeStorageClassProps
import imports.k8s.ObjectMeta
import org.cdk8s.ApiObjectMetadata
import org.cdk8s.Chart
import org.cdk8s.ChartProps
import org.cdk8s.Size
import org.cdk8s.plus28.PersistentVolume
import org.cdk8s.plus28.PersistentVolumeAccessMode
import org.cdk8s.plus28.PersistentVolumeClaim
import org.cdk8s.plus28.PersistentVolumeClaimProps
import software.constructs.Construct

class ProductionBlockStorage(scope: Construct, id: String,
                             props: ChartProps? = null,): Chart(scope, id, props) {
    val storageClass = KubeStorageClass(
        this,
        "oci-free-storage-class",
        KubeStorageClassProps
            .builder()
            .metadata(
                ObjectMeta.builder()
                    .name("oci-free")
                    .build()
            )
            .provisioner("blockvolume.csi.oraclecloud.com")
            .parameters(
                mapOf(
                    "vpusPerGB" to "0"
                )
            )
            .reclaimPolicy("Retain")
            .volumeBindingMode("WaitForFirstConsumer")
            .allowVolumeExpansion(true)
            .build()
    )

    val volumeClaim = PersistentVolumeClaim(
        this,
        "global-data-volume-claim",
        PersistentVolumeClaimProps.builder()
            .metadata(
                ApiObjectMetadata.builder()
                    .name("arthur-global-data")
                    .build()
            )
            .storageClassName(storageClass.name)
            .accessModes(
                listOf(
                    PersistentVolumeAccessMode.READ_WRITE_ONCE
                )
            )
            .storage(Size.gibibytes(50))
            .volume(
                PersistentVolume.fromPersistentVolumeName(
                    this,
                    "pvc-hard-link",
                    "csi-57c34efd-2ee2-48e8-9d30-6c960576bd44"
                )
            )
            .build()
    )
}