-- Adds Billing Type (Time and Materials / Fixed Monthly / Per Service / Per Event) per (site, trade), same as
-- Vendor/Sub-Vendor/Contract already work on site_trade_assignments.
alter table site_trade_assignments add column if not exists billing_type text;
