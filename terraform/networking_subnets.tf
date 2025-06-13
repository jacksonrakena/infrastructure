resource "oci_core_subnet" "kube_api" {
  cidr_block                 = "10.0.0.0/28"
  compartment_id             = oci_license_manager_configuration.license.id
  dhcp_options_id            = oci_core_vcn.arthur_vcn.default_dhcp_options_id
  display_name               = "arthur_kube_api_subnet"
  dns_label                  = "sub17a7f45fe"
  prohibit_internet_ingress  = "false"
  prohibit_public_ip_on_vnic = "false"
  route_table_id             = oci_core_vcn.arthur_vcn.default_route_table_id
  security_list_ids = [
    oci_core_security_list.arthur_kubeapi_seclist.id,
  ]
  vcn_id = oci_core_vcn.arthur_vcn.id
}

resource "oci_core_subnet" "kube_nodes" {
  cidr_block                 = "10.0.10.0/24"
  compartment_id             = oci_license_manager_configuration.license.id
  dhcp_options_id            = oci_core_vcn.arthur_vcn.default_dhcp_options_id
  display_name               = "arthur_kube_nodes_subnet"
  dns_label                  = "sub3d6a20e03"
  prohibit_internet_ingress  = "true"
  prohibit_public_ip_on_vnic = "true"
  route_table_id             = oci_core_route_table.arthur_private_route.id
  security_list_ids = [
    oci_core_security_list.arthur_node_seclist.id,
  ]
  vcn_id = oci_core_vcn.arthur_vcn.id
}

resource "oci_core_subnet" "kube_svclb" {
  cidr_block                 = "10.0.20.0/24"
  compartment_id             = oci_license_manager_configuration.license.id
  dhcp_options_id            = oci_core_vcn.arthur_vcn.default_dhcp_options_id
  display_name               = "arthur_svclb_subnet"
  dns_label                  = "lbsub90c819d24"
  prohibit_internet_ingress  = "false"
  prohibit_public_ip_on_vnic = "false"
  route_table_id             = oci_core_vcn.arthur_vcn.default_route_table_id
  security_list_ids = [
    oci_core_vcn.arthur_vcn.default_security_list_id,
  ]
  vcn_id = oci_core_vcn.arthur_vcn.id
}
