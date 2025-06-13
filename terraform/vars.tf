variable "region" { default = "ap-melbourne-1" }
variable "compartment_ocid" { default = "ocid1.tenancy.oc1..aaaaaaaagxra3x2chdjhoebgoulqchndl53vmavq5znr3vkp6m4a2fcoebsa" }
variable "tenancy_ocid" { default = "ocid1.tenancy.oc1..aaaaaaaagxra3x2chdjhoebgoulqchndl53vmavq5znr3vkp6m4a2fcoebsa" }
variable "ssh_public_key" { default = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAkB8DAqKuFebsHWGtPJ2FkOu+/ML3ZBrXCX94+9MCqX jackson@jacksons-mbp.lan" }
data "oci_identity_availability_domain" "ap_melbourne_1_ad_1" {
  compartment_id = oci_license_manager_configuration.license.id
  ad_number      = "1"
}
