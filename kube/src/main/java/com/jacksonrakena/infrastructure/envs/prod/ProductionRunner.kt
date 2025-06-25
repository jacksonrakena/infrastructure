package com.jacksonrakena.infrastructure.envs.prod

import org.cdk8s.ApiObjectMetadata
import org.cdk8s.Chart
import org.cdk8s.ChartProps
import org.cdk8s.plus28.Namespace
import org.cdk8s.plus28.NamespaceProps
import software.constructs.Construct

class ProductionRunner(scope: Construct, id: String, options: ChartProps? = null) : Chart(scope, id, options) {
    val namespace = Namespace(
        this,
        "prod-namespace",
        NamespaceProps
            .builder()
            .metadata(
                ApiObjectMetadata
                    .builder()
                    .name("prod")
                    .build()
            )
            .build()
    )

    val prodStack = ProductionStack(
        this,
        "production",
        ChartProps.builder().namespace(namespace.name).build()
    )
}