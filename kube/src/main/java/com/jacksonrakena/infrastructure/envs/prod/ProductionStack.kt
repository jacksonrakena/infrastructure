package com.jacksonrakena.infrastructure.envs.prod

import com.jacksonrakena.infrastructure.apps.GradekeeperServer
import com.jacksonrakena.infrastructure.apps.Identity
import com.jacksonrakena.infrastructure.apps.Jacksonbot
import com.jacksonrakena.infrastructure.apps.Mixer
import com.jacksonrakena.infrastructure.apps.Mxbudget
import com.jacksonrakena.infrastructure.apps.persistence.Bouncer
import com.jacksonrakena.infrastructure.apps.persistence.Galahad
import com.jacksonrakena.infrastructure.traefik.TraefikStack
import com.jacksonrakena.infrastructure.util.loadTlsSecretFromFolder
import org.cdk8s.ApiObjectMetadata
import org.cdk8s.Chart
import org.cdk8s.ChartProps
import org.cdk8s.plus28.HttpIngressPathType
import org.cdk8s.plus28.Ingress
import org.cdk8s.plus28.IngressBackend
import org.cdk8s.plus28.IngressProps
import org.cdk8s.plus28.IngressRule
import org.cdk8s.plus28.IngressTls
import org.cdk8s.plus28.TlsSecret
import software.constructs.Construct

class ProductionStack(
    scope: Construct,
    id: String,
    props: ChartProps,
) : Chart(scope, id, props) {
    val credentials = ProductionCredentials(this, "credentials", props)

    val storage = ProductionBlockStorage(this, id, props)

    val galahad = Galahad(
        this,
        "galahad",
        credentials.vaultwardenSecret,
        credentials.postgresSecret,
        storage.volumeClaim,
        props
    )

    val bouncer = Bouncer(this, "bouncer", galahad, props)

    val tf = TraefikStack(this, "traefik", props)
    val gks = GradekeeperServer(
        this,
        "gk-server",
        credentials.gradekeeperConfigMap,
        galahad.postgresService,
        credentials.githubRegistrySecret
    )

    val ident = Identity(this, "id", credentials.keycloakConfigMap, galahad, props)

    val jacksonbot =
        Jacksonbot(
            this,
            "jacksonbot",
            credentials.jacksonbotConfigMap,
            credentials.githubRegistrySecret,
            galahad.postgresService,
            props
        )

    val mx = Mixer(this, "mixer", credentials.mixerConfigMap, credentials.githubRegistrySecret, props)
    val mxbudget = Mxbudget(
        this,
        "mxbudget",
        credentials.githubRegistrySecret,
        bouncer.service,
        credentials.mxbudgetConfigMap,
        props
    )

    val rakenaComAuTlsSecret =
        TlsSecret(
            this, "rakena-com-au-cert",
            loadTlsSecretFromFolder("secrets/cert-rakena.com.au")
        )
    val rakenaCoNzTldSecret = TlsSecret(
        this, "rakena-co-nz-cert",
        loadTlsSecretFromFolder("secrets/cert-rakena.co.nz")
    )

    val ingress = Ingress(
        this, "ingress", IngressProps.builder()
            .metadata(
                ApiObjectMetadata.builder()
                    .annotations(
                        mapOf(
                            "traefik.ingress.kubernetes.io/router.tls" to "true",
                            "traefik.ingress.kubernetes.io/router.entrypoints" to "websecure"
                        )
                    ).build()
            )
            .tls(
                listOf(
                    IngressTls.builder()
                        .secret(rakenaComAuTlsSecret)
                        .hosts(
                            listOf(
                                "id.rakena.com.au",
                                "budget.rakena.com.au",
                                "vault.rakena.com.au"
                            )
                        )
                        .build(),
                    IngressTls.builder()
                        .secret(rakenaCoNzTldSecret)
                        .hosts(
                            listOf(
                                "vault.rakena.co.nz"
                            )
                        ).build()
                )
            )
            .rules(
                listOf(
                    IngressRule.builder()
                        .host("budget.rakena.com.au")
                        .pathType(HttpIngressPathType.PREFIX)
                        .backend(IngressBackend.fromService(mxbudget.service))
                        .build(),
                    IngressRule.builder()
                        .host("id.rakena.com.au")
                        .pathType(HttpIngressPathType.PREFIX)
                        .backend(IngressBackend.fromService(ident.service))
                        .build(),
                    IngressRule.builder()
                        .host("vault.rakena.com.au")
                        .pathType(HttpIngressPathType.PREFIX)
                        .backend(IngressBackend.fromService(galahad.vaultService))
                        .build(),
                    IngressRule.builder()
                        .host("vault.rakena.co.nz")
                        .pathType(HttpIngressPathType.PREFIX)
                        .backend(IngressBackend.fromService(galahad.vaultService))
                        .build(),
                    IngressRule.builder()
                        .host("api.gradekeeper.xyz")
                        .pathType(HttpIngressPathType.PREFIX)
                        .backend(IngressBackend.fromService(gks.service))
                        .build(),
                )
            )
            .build()
    )
}