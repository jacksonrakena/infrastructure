resource "oci_core_security_list" "arthur_node_seclist" {
  compartment_id = oci_license_manager_configuration.license.id
  display_name   = "arthur_node_seclist"
  egress_security_rules {
    description      = "Allow pods on one worker node to communicate with pods on other worker nodes"
    destination      = "10.0.10.0/24"
    destination_type = "CIDR_BLOCK"
    protocol         = "all"
    stateless        = "false"
  }
  egress_security_rules {
    description      = "Access to Kubernetes API Endpoint"
    destination      = "10.0.0.0/28"
    destination_type = "CIDR_BLOCK"
    protocol         = "6"
    stateless        = "false"
    tcp_options {
      max = "6443"
      min = "6443"
    }
  }
  egress_security_rules {
    description      = "Kubernetes worker to control plane communication"
    destination      = "10.0.0.0/28"
    destination_type = "CIDR_BLOCK"
    protocol         = "6"
    stateless        = "false"
    tcp_options {
      max = "12250"
      min = "12250"
    }
  }
  egress_security_rules {
    description      = "Path discovery"
    destination      = "10.0.0.0/28"
    destination_type = "CIDR_BLOCK"
    icmp_options {
      code = "4"
      type = "3"
    }
    protocol  = "1"
    stateless = "false"
  }
  egress_security_rules {
    description      = "Allow nodes to communicate with OKE to ensure correct start-up and continued functioning"
    destination      = "all-mel-services-in-oracle-services-network"
    destination_type = "SERVICE_CIDR_BLOCK"
    protocol         = "6"
    stateless        = "false"
    tcp_options {
      max = "443"
      min = "443"
    }
  }
  egress_security_rules {
    description      = "ICMP Access from Kubernetes Control Plane"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    icmp_options {
      code = "4"
      type = "3"
    }
    protocol  = "1"
    stateless = "false"
  }
  egress_security_rules {
    description      = "Worker Nodes access to Internet"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    protocol         = "all"
    stateless        = "false"
  }
  ingress_security_rules {
    description = "Allow pods on one worker node to communicate with pods on other worker nodes"
    protocol    = "all"
    source      = "10.0.10.0/24"
    source_type = "CIDR_BLOCK"
    stateless   = "false"
  }
  ingress_security_rules {
    description = "Path discovery"
    icmp_options {
      code = "4"
      type = "3"
    }
    protocol    = "1"
    source      = "10.0.0.0/28"
    source_type = "CIDR_BLOCK"
    stateless   = "false"
    #tcp_options = <<Optional value not found in discovery>>
    #udp_options = <<Optional value not found in discovery>>
  }
  ingress_security_rules {
    description = "TCP access from Kubernetes Control Plane"
    #icmp_options = <<Optional value not found in discovery>>
    protocol    = "6"
    source      = "10.0.0.0/28"
    source_type = "CIDR_BLOCK"
    stateless   = "false"
    #tcp_options = <<Optional value not found in discovery>>
    #udp_options = <<Optional value not found in discovery>>
  }
  ingress_security_rules {
    description = "Inbound SSH traffic to worker nodes"
    #icmp_options = <<Optional value not found in discovery>>
    protocol    = "6"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = "false"
    tcp_options {
      max = "22"
      min = "22"
      #source_port_range = <<Optional value not found in discovery>>
    }
    #udp_options = <<Optional value not found in discovery>>
  }
  ingress_security_rules {
    description = "[Jackson added 2023-08-13] Allow worker nodes to receive connections through OCI Network Load Balancer."
    #icmp_options = <<Optional value not found in discovery>>
    protocol    = "6"
    source      = "10.0.20.0/24"
    source_type = "CIDR_BLOCK"
    stateless   = "false"
    #tcp_options = <<Optional value not found in discovery>>
    #udp_options = <<Optional value not found in discovery>>
  }
  #   ingress_security_rules {
  #     #description = <<Optional value not found in discovery>>
  #     #icmp_options = <<Optional value not found in discovery>>
  #     protocol    = "6"
  #     source      = "10.0.20.0/24"
  #     source_type = "CIDR_BLOCK"
  #     stateless   = "false"
  #     tcp_options {
  #       max = "31850"
  #       min = "31850"
  #       #source_port_range = <<Optional value not found in discovery>>
  #     }
  #     #udp_options = <<Optional value not found in discovery>>
  #   }
  #   ingress_security_rules {
  #     #description = <<Optional value not found in discovery>>
  #     #icmp_options = <<Optional value not found in discovery>>
  #     protocol    = "6"
  #     source      = "10.0.20.0/24"
  #     source_type = "CIDR_BLOCK"
  #     stateless   = "false"
  #     tcp_options {
  #       max = "30063"
  #       min = "30063"
  #       #source_port_range = <<Optional value not found in discovery>>
  #     }
  #     #udp_options = <<Optional value not found in discovery>>
  #   }
  #   ingress_security_rules {
  #     #description = <<Optional value not found in discovery>>
  #     #icmp_options = <<Optional value not found in discovery>>
  #     protocol    = "6"
  #     source      = "10.0.20.0/24"
  #     source_type = "CIDR_BLOCK"
  #     stateless   = "false"
  #     tcp_options {
  #       max = "32713"
  #       min = "32713"
  #       #source_port_range = <<Optional value not found in discovery>>
  #     }
  #     #udp_options = <<Optional value not found in discovery>>
  #   }
  #   ingress_security_rules {
  #     #description = <<Optional value not found in discovery>>
  #     #icmp_options = <<Optional value not found in discovery>>
  #     protocol    = "6"
  #     source      = "10.0.20.0/24"
  #     source_type = "CIDR_BLOCK"
  #     stateless   = "false"
  #     tcp_options {
  #       max = "10256"
  #       min = "10256"
  #       #source_port_range = <<Optional value not found in discovery>>
  #     }
  #     #udp_options = <<Optional value not found in discovery>>
  #   }
  #   ingress_security_rules {
  #     #description = <<Optional value not found in discovery>>
  #     #icmp_options = <<Optional value not found in discovery>>
  #     protocol    = "6"
  #     source      = "10.0.20.0/24"
  #     source_type = "CIDR_BLOCK"
  #     stateless   = "false"
  #     tcp_options {
  #       max = "30559"
  #       min = "30559"
  #       #source_port_range = <<Optional value not found in discovery>>
  #     }
  #     #udp_options = <<Optional value not found in discovery>>
  #   }
  vcn_id = oci_core_vcn.arthur_vcn.id
}

resource "oci_core_security_list" "arthur_kubeapi_seclist" {
  compartment_id = oci_license_manager_configuration.license.id
  display_name   = "oke-k8sApiEndpoint-quick-arthur-c04e4a862"
  egress_security_rules {
    description      = "Allow Kubernetes Control Plane to communicate with OKE"
    destination      = "all-mel-services-in-oracle-services-network"
    destination_type = "SERVICE_CIDR_BLOCK"
    #icmp_options = <<Optional value not found in discovery>>
    protocol  = "6"
    stateless = "false"
    tcp_options {
      max = "443"
      min = "443"
      #source_port_range = <<Optional value not found in discovery>>
    }
    #udp_options = <<Optional value not found in discovery>>
  }
  egress_security_rules {
    description      = "All traffic to worker nodes"
    destination      = "10.0.10.0/24"
    destination_type = "CIDR_BLOCK"
    #icmp_options = <<Optional value not found in discovery>>
    protocol  = "6"
    stateless = "false"
    #tcp_options = <<Optional value not found in discovery>>
    #udp_options = <<Optional value not found in discovery>>
  }
  egress_security_rules {
    description      = "Path discovery"
    destination      = "10.0.10.0/24"
    destination_type = "CIDR_BLOCK"
    icmp_options {
      code = "4"
      type = "3"
    }
    protocol  = "1"
    stateless = "false"
    #tcp_options = <<Optional value not found in discovery>>
    #udp_options = <<Optional value not found in discovery>>
  }
  ingress_security_rules {
    description = "External access to Kubernetes API endpoint"
    #icmp_options = <<Optional value not found in discovery>>
    protocol    = "6"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = "false"
    tcp_options {
      max = "6443"
      min = "6443"
      #source_port_range = <<Optional value not found in discovery>>
    }
    #udp_options = <<Optional value not found in discovery>>
  }
  ingress_security_rules {
    description = "Kubernetes worker to Kubernetes API endpoint communication"
    #icmp_options = <<Optional value not found in discovery>>
    protocol    = "6"
    source      = "10.0.10.0/24"
    source_type = "CIDR_BLOCK"
    stateless   = "false"
    tcp_options {
      max = "6443"
      min = "6443"
      #source_port_range = <<Optional value not found in discovery>>
    }
    #udp_options = <<Optional value not found in discovery>>
  }
  ingress_security_rules {
    description = "Kubernetes worker to control plane communication"
    #icmp_options = <<Optional value not found in discovery>>
    protocol    = "6"
    source      = "10.0.10.0/24"
    source_type = "CIDR_BLOCK"
    stateless   = "false"
    tcp_options {
      max = "12250"
      min = "12250"
      #source_port_range = <<Optional value not found in discovery>>
    }
    #udp_options = <<Optional value not found in discovery>>
  }
  ingress_security_rules {
    description = "Path discovery"
    icmp_options {
      code = "4"
      type = "3"
    }
    protocol    = "1"
    source      = "10.0.10.0/24"
    source_type = "CIDR_BLOCK"
    stateless   = "false"
    #tcp_options = <<Optional value not found in discovery>>
    #udp_options = <<Optional value not found in discovery>>
  }
  vcn_id = oci_core_vcn.arthur_vcn.id
}

resource "oci_core_default_security_list" "arthur_svclb_seclist" {
  compartment_id = oci_license_manager_configuration.license.id
  display_name   = "oke-svclbseclist-quick-arthur-c04e4a862"
  egress_security_rules {
    description      = "Allow OCI load balancer or network load balancer to communicate with kube-proxy on worker nodes."
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    #icmp_options = <<Optional value not found in discovery>>
    protocol  = "all"
    stateless = "false"
    #tcp_options = <<Optional value not found in discovery>>
    #udp_options = <<Optional value not found in discovery>>
  }
  egress_security_rules {
    #description = <<Optional value not found in discovery>>
    destination      = "10.0.10.0/24"
    destination_type = "CIDR_BLOCK"
    #icmp_options = <<Optional value not found in discovery>>
    protocol  = "6"
    stateless = "false"
    tcp_options {
      max = "31850"
      min = "31850"
      #source_port_range = <<Optional value not found in discovery>>
    }
    #udp_options = <<Optional value not found in discovery>>
  }
  egress_security_rules {
    #description = <<Optional value not found in discovery>>
    destination      = "10.0.10.0/24"
    destination_type = "CIDR_BLOCK"
    #icmp_options = <<Optional value not found in discovery>>
    protocol  = "6"
    stateless = "false"
    tcp_options {
      max = "30063"
      min = "30063"
      #source_port_range = <<Optional value not found in discovery>>
    }
    #udp_options = <<Optional value not found in discovery>>
  }
  egress_security_rules {
    #description = <<Optional value not found in discovery>>
    destination      = "10.0.10.0/24"
    destination_type = "CIDR_BLOCK"
    #icmp_options = <<Optional value not found in discovery>>
    protocol  = "6"
    stateless = "false"
    tcp_options {
      max = "32713"
      min = "32713"
      #source_port_range = <<Optional value not found in discovery>>
    }
    #udp_options = <<Optional value not found in discovery>>
  }
  egress_security_rules {
    #description = <<Optional value not found in discovery>>
    destination      = "10.0.10.0/24"
    destination_type = "CIDR_BLOCK"
    #icmp_options = <<Optional value not found in discovery>>
    protocol  = "6"
    stateless = "false"
    tcp_options {
      max = "10256"
      min = "10256"
      #source_port_range = <<Optional value not found in discovery>>
    }
    #udp_options = <<Optional value not found in discovery>>
  }
  egress_security_rules {
    #description = <<Optional value not found in discovery>>
    destination      = "10.0.10.0/24"
    destination_type = "CIDR_BLOCK"
    #icmp_options = <<Optional value not found in discovery>>
    protocol  = "6"
    stateless = "false"
    tcp_options {
      max = "30559"
      min = "30559"
      #source_port_range = <<Optional value not found in discovery>>
    }
    #udp_options = <<Optional value not found in discovery>>
  }
  freeform_tags = {
  }
  ingress_security_rules {
    description = "Allow inbound traffic to Load Balancer."
    #icmp_options = <<Optional value not found in discovery>>
    protocol    = "6"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = "false"
    #tcp_options = <<Optional value not found in discovery>>
    #udp_options = <<Optional value not found in discovery>>
  }
  ingress_security_rules {
    #description = <<Optional value not found in discovery>>
    #icmp_options = <<Optional value not found in discovery>>
    protocol    = "6"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = "false"
    tcp_options {
      max = "80"
      min = "80"
      #source_port_range = <<Optional value not found in discovery>>
    }
    #udp_options = <<Optional value not found in discovery>>
  }
  ingress_security_rules {
    #description = <<Optional value not found in discovery>>
    #icmp_options = <<Optional value not found in discovery>>
    protocol    = "6"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = "false"
    tcp_options {
      max = "443"
      min = "443"
      #source_port_range = <<Optional value not found in discovery>>
    }
    #udp_options = <<Optional value not found in discovery>>
  }
  ingress_security_rules {
    #description = <<Optional value not found in discovery>>
    #icmp_options = <<Optional value not found in discovery>>
    protocol    = "6"
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless   = "false"
    tcp_options {
      max = "8080"
      min = "8080"
      #source_port_range = <<Optional value not found in discovery>>
    }
    #udp_options = <<Optional value not found in discovery>>
  }
  manage_default_resource_id = oci_core_vcn.arthur_vcn.default_security_list_id
}
