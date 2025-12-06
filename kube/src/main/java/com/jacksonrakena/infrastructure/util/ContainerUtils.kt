package com.jacksonrakena.infrastructure.util

import org.cdk8s.Size
import org.cdk8s.plus28.ContainerProps
import org.cdk8s.plus28.ContainerResources
import org.cdk8s.plus28.ContainerSecurityContextProps
import org.cdk8s.plus28.Cpu
import org.cdk8s.plus28.CpuResources
import org.cdk8s.plus28.MemoryResources
import kotlin.time.Duration

fun ContainerProps.Builder.applyCommonConfiguration(): ContainerProps.Builder {
    return this.resources(
        ContainerResources.builder()
            .cpu(CpuResources.builder().build())
            .memory(MemoryResources.builder().request(Size.mebibytes(500)).build())
            .build()
    )
        .securityContext(
            ContainerSecurityContextProps.builder().readOnlyRootFilesystem(false).ensureNonRoot(false).build()
        )
}
