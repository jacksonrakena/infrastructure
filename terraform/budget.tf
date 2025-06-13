resource "oci_budget_budget" "no_spending" {
  amount                                = "1"
  budget_processing_period_start_offset = "1"
  compartment_id                        = oci_license_manager_configuration.license.id
  description                           = "No spending"
  display_name                          = "no-spending-budget"

  processing_period_type = "MONTH"
  reset_period           = "MONTHLY"
  target_type            = "COMPARTMENT"
  targets = [
    oci_license_manager_configuration.license.id,
  ]
}

resource "oci_budget_alert_rule" "alert_on_any_spending" {
  budget_id      = oci_budget_budget.no_spending.id
  description    = "Alerts on any spending above 1 percent in account"
  display_name   = "alert-on-any-spending"
  message        = "Spending"
  recipients     = "jackson@rakena.com.au"
  threshold      = "1"
  threshold_type = "PERCENTAGE"
  type           = "FORECAST"
}

