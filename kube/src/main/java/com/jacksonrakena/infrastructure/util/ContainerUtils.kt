package com.jacksonrakena.infrastructure.util

import org.cdk8s.Size
import org.cdk8s.plus28.ContainerProps
import org.cdk8s.plus28.ContainerResources
import org.cdk8s.plus28.ContainerSecurityContextProps
import org.cdk8s.plus28.Cpu
import org.cdk8s.plus28.CpuResources
import org.cdk8s.plus28.MemoryResources

fun ContainerProps.Builder.applyCommonConfiguration(): ContainerProps.Builder {
    return this.resources(
        ContainerResources.builder()
            .cpu(CpuResources.builder().limit(Cpu.millis(1000)).request(Cpu.millis(0)).build())
            .memory(MemoryResources.builder().limit(Size.gibibytes(1000)).request(Size.gibibytes(0)).build())
            .build()
    )
        .securityContext(
            ContainerSecurityContextProps.builder().readOnlyRootFilesystem(false).ensureNonRoot(false).build()
        )
}