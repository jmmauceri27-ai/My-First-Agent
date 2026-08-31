-- Billing Type moves from a per-(site, trade) field to a field on the Contract itself, so setting it once on
-- a contract applies it to every site/trade linked to that contract (see migration 038, now superseded).
alter table crm_contracts add column if not exists billing_type text;

alter table site_trade_assignments drop column if exists billing_type;
