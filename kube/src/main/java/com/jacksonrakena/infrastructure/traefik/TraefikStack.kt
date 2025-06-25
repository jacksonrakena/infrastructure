package com.jacksonrakena.infrastructure.traefik

import imports.k8s.Container
import imports.k8s.ContainerPort
import imports.k8s.DeploymentSpec
import imports.k8s.IntOrString
import imports.k8s.KubeDeployment
import imports.k8s.KubeDeploymentProps
import imports.k8s.KubeService
import imports.k8s.KubeServiceProps
import imports.k8s.LabelSelector
import imports.k8s.ObjectMeta
import imports.k8s.PodSpec
import imports.k8s.PodTemplateSpec
import imports.k8s.ServicePort
import imports.k8s.ServiceSpec
import org.cdk8s.Chart
import org.cdk8s.ChartProps
import org.cdk8s.plus28.ApiResource
import org.cdk8s.plus28.ApiResourceOptions
import org.cdk8s.plus28.ClusterRole
import org.cdk8s.plus28.ClusterRolePolicyRule
import org.cdk8s.plus28.ClusterRoleProps
import org.cdk8s.plus28.IApiEndpoint
import org.cdk8s.plus28.ServiceAccount
import org.cdk8s.plus28.ServiceAccountProps
import org.cdk8s.plus28.k8s.KubeClusterRoleBinding
import org.cdk8s.plus28.k8s.KubeClusterRoleBindingProps
import org.cdk8s.plus28.k8s.RoleRef
import org.cdk8s.plus28.k8s.Subject
import software.constructs.Construct

class TraefikStack(scope: Construct, id: String, options: ChartProps? = null): Chart(scope, id, options) {
    val serviceAccount = ServiceAccount(this, "traefik-service-account", ServiceAccountProps.builder()
        .automountToken(true).build())
    val clusterRole = ClusterRole(this, "cluster-role", ClusterRoleProps.builder()
        .rules(
            listOf(
                ClusterRolePolicyRule.builder().verbs(listOf("get","list","watch")).endpoints(
                    listOf(
                        ApiResource.SERVICES,
                        ApiResource.SECRETS,
                        ApiResource.NODES
                    )
                ).build(),
                ClusterRolePolicyRule.builder().verbs(listOf("list","watch")).endpoints(
                    listOf(
                        ApiResource.ENDPOINT_SLICES
                    )
                ).build(),
                ClusterRolePolicyRule.builder().verbs(listOf("get","list","watch")).endpoints(
                    listOf(
                        ApiResource.INGRESSES,
                        ApiResource.INGRESS_CLASSES
                    )
                ).build(),
                makeClusterRolePolicyRule(listOf("update"),listOf(
                    ApiResource.custom(ApiResourceOptions.builder().apiGroup("networking.k8s.io").resourceType("ingresses/status").build()),
                    ApiResource.custom(ApiResourceOptions.builder().apiGroup("extensions").resourceType("ingresses/status").build())
                )),

                makeClusterRolePolicyRule(
                    listOf("get", "list", "watch"), makeCustomApiResources(
                        "traefik.io", listOf(
                            "middlewares",
                            "middlewaretcps",
                            "ingressroutes",
                            "traefikservices",
                            "ingressroutetcps",
                            "ingressrouteudps",
                            "tlsoptions",
                            "tlsstores",
                            "serverstransports",
                            "serverstransporttcps",
                        )
                    )
                )
            )
        ).build())
    val roleBinding = KubeClusterRoleBinding(this, "role-binding", KubeClusterRoleBindingProps.builder()
        .roleRef(RoleRef.builder().name(clusterRole.name).kind(clusterRole.kind).apiGroup(clusterRole.apiGroup).build())
        .subjects(listOf(
            Subject.builder().kind(serviceAccount.kind).name(serviceAccount.name).namespace(serviceAccount.metadata.namespace).build()
        ))
        .build())
    val service = KubeService(
        this,
        "service",
        KubeServiceProps.builder()
            .metadata(ObjectMeta.builder().annotations(mapOf(
                "oci.oraclecloud.com/load-balancer-type" to "nlb"
            )).build())
            .spec(ServiceSpec.builder()
                .type("LoadBalancer")
                .externalTrafficPolicy("Cluster")
                .loadBalancerIp("158.179.25.151")
                .ports(
                    listOf(
                        ServicePort.builder().name("websecure").port(443).targetPort(IntOrString.fromString("websecure")).build()
                    )
                )
                .selector(mapOf(
                    "app" to "traefik"
                ))
                .build())
            .build()
    )

    val deployment = KubeDeployment(
        this,
        "deployment",
        KubeDeploymentProps.builder()
            .spec(DeploymentSpec.builder()
                .replicas(1)
                .selector(LabelSelector.builder()
                    .matchLabels(mapOf(
                        "app" to "traefik"
                    )).build())
                .template(PodTemplateSpec.builder()
                    .metadata(ObjectMeta.builder().labels(mapOf(
                        "app" to "traefik"
                    )).build())
                    .spec(PodSpec.builder()
                        .serviceAccountName(serviceAccount.name)
                        .containers(
                            listOf(
                                Container.builder()
                                    .name("traefik")
                                    .image("traefik:v3.4")
                                    .args(listOf(
                                        "--entrypoints.websecure.address=:443",
                                        "--entrypoints.websecure.http.tls=true",
                                        "--providers.kubernetesingress=true"
                                    ))
                                    .ports(
                                        listOf(
                                            ContainerPort.builder().name("websecure").containerPort(443).build()
                                        )
                                    ).build()
                            )
                        )
                        .build())
                    .build())
                .build())
            .build()
    )

    companion object {
        fun makeClusterRolePolicyRule(
            verbs: List<String>,
            endpoints: List<IApiEndpoint>
        ): ClusterRolePolicyRule {
            return ClusterRolePolicyRule.builder().verbs(verbs).endpoints(
                endpoints
            ).build()
        }
        fun makeCustomApiResources(apiGroup: String, resourceTypes: List<String>): List<ApiResource> {
            return resourceTypes.map { ApiResource.custom(ApiResourceOptions.builder().apiGroup(apiGroup).resourceType(it).build()) }
        }
    }
}