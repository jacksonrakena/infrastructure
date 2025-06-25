package com.jacksonrakena.infrastructure.envs.prod

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import org.cdk8s.Chart
import org.cdk8s.ChartProps
import org.cdk8s.plus28.ConfigMap
import org.cdk8s.plus28.ConfigMapProps
import org.cdk8s.plus28.DockerConfigSecret
import org.cdk8s.plus28.DockerConfigSecretProps
import org.cdk8s.plus28.IConfigMap
import org.cdk8s.plus28.Secret
import org.cdk8s.plus28.SecretProps
import software.constructs.Construct
import java.nio.file.Files
import java.nio.file.Path

class ProductionCredentials(scope: Construct, id: String, options: ChartProps) : Chart(scope, id, options) {
    fun createNamespacedConfigMapFromFile(
        id: String,
        fileName: String
    ): IConfigMap {
        return ConfigMap(
            this,
            id,
            ConfigMapProps.builder()
                .immutable(false)
                .data(createStringDataFromFile(fileName))
                .build()
        )
    }

    fun createNamespacedSecretFromFile(
        id: String,
        fileName: String
    ): Secret {
        return Secret(
            this,
            id,
            SecretProps.builder()
                .stringData(
                    createStringDataFromFile(fileName)
                ).immutable(false).build()
        )
    }

    fun createStringDataFromFile(name: String): Map<String, String> {
        return Files.readAllLines(Path.of(name)).map { line ->
            val out = line.split("=")
            return@map Pair(out[0], out[1])
        }.toMap()
    }

    val vaultwardenSecret = createNamespacedSecretFromFile("vault-secret", "secrets/vaultwarden.env")
    val postgresSecret = createNamespacedSecretFromFile(
        "pg-secret",
        "secrets/galahad-secret.env"
    )

    val githubRegistrySecret = DockerConfigSecret(
        this, "gh-secret", DockerConfigSecretProps.builder()
            .immutable(false)
            .data(
                ObjectMapper().readValue(
                    Files.readString(Path.of("secrets/docker-registry-config.json")),
                    object : TypeReference<HashMap<String, Object>>() {}
                )
            )
            .build())

    val gradekeeperConfigMap = createNamespacedConfigMapFromFile(
        "gradekeeper-config",
        "secrets/gradekeeper-server.env"
    )

    val keycloakConfigMap = createNamespacedConfigMapFromFile(
        "keycloak-config",
        "secrets/keycloak.env"
    )

    val jacksonbotConfigMap = ConfigMap(
        this,
        "jacksonbot-config",
        ConfigMapProps.builder()
            .data(
                mapOf(
                    "jacksonbot.appsettings.json" to Files.readString(Path.of("secrets/jacksonbot-config.json"))
                )
            )
            .immutable(false).build()
    )

    val mixerConfigMap = createNamespacedConfigMapFromFile(
        "mixer-config",
        "secrets/mixer.env"
    )

    val mxbudgetConfigMap = createNamespacedConfigMapFromFile(
        "mxbudget-config",
        "secrets/mxbudget.env"
    )
}