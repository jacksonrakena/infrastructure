package com.jacksonrakena.infrastructure

import com.jacksonrakena.infrastructure.envs.prod.ProductionRunner
import org.cdk8s.App

fun main() {
    val app = App()
    ProductionRunner(app, "jci")
    app.synth()
}