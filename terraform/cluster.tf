resource "oci_containerengine_node_pool" "main" {
  cluster_id         = oci_containerengine_cluster.arthur.id
  compartment_id     = oci_license_manager_configuration.license.id
  kubernetes_version = "v1.31.1"
  name               = "pool1"
  node_config_details {
    node_pool_pod_network_option_details {
      cni_type          = "OCI_VCN_IP_NATIVE"
      max_pods_per_node = "31"
      pod_nsg_ids       = []
      pod_subnet_ids = [
        oci_core_subnet.kube_nodes.id,
      ]
    }
    nsg_ids = []
    placement_configs {
      availability_domain = data.oci_identity_availability_domain.ap_melbourne_1_ad_1.name
      subnet_id           = oci_core_subnet.kube_nodes.id
    }
    size = "2"
  }
  node_eviction_node_pool_settings {
    eviction_grace_duration = "PT1H"
  }
  node_shape = "VM.Standard.A1.Flex"
  node_shape_config {
    memory_in_gbs = "12"
    ocpus         = "2"
  }
  ssh_public_key = var.ssh_public_key
}

resource "oci_containerengine_cluster" "arthur" {
  cluster_pod_network_options {
    cni_type = "OCI_VCN_IP_NATIVE"
  }
  compartment_id = oci_license_manager_configuration.license.id
  endpoint_config {
    is_public_ip_enabled = "true"
    nsg_ids = [
    ]
    subnet_id = oci_core_subnet.kube_api.id
  }
  image_policy_config {
    is_policy_enabled = "false"
  }
  kubernetes_version = "v1.32.1"
  name               = "arthur"
  options {
    add_ons {
      is_kubernetes_dashboard_enabled = "false"
      is_tiller_enabled               = "false"
    }
    admission_controller_options {
      is_pod_security_policy_enabled = "false"
    }
    ip_families = [
      "IPv4",
    ]
    kubernetes_network_config {
      pods_cidr     = "10.244.0.0/16"
      services_cidr = "10.96.0.0/16"
    }
    service_lb_subnet_ids = [
      oci_core_subnet.kube_svclb.id,
    ]
  }
  type   = "BASIC_CLUSTER"
  vcn_id = oci_core_vcn.arthur_vcn.id
}

