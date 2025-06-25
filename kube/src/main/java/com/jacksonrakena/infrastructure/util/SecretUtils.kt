package com.jacksonrakena.infrastructure.util

import org.cdk8s.plus28.TlsSecretProps
import java.nio.file.Files
import java.nio.file.Path

fun loadTlsSecretFromFolder(path: String): TlsSecretProps {
    val crt = Files.readString(Path.of(path).resolve("tls.crt"))
    val key = Files.readString(Path.of(path).resolve("tls.key"))

    return TlsSecretProps.builder().tlsCert(crt).tlsKey(key).build()
}