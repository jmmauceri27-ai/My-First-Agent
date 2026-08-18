-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- AFTER 031_site_trade_assignments.sql and after you've re-entered your Vendor
-- assignments per trade on each site (see that migration's comment -- Vendor,
-- Sub-Vendor, Contract Value, Sub Price, and Sub-Vendor Price are now tracked
-- per trade instead of once per site, so these old site-level columns are no
-- longer read or written by the app and their existing values are discarded).
-- Safe to defer -- the app works correctly whether or not you've run this yet.

alter table sites
  drop column if exists vendor_id,
  drop column if exists sub_vendor_id,
  drop column if exists contract_value,
  drop column if exists sub_price,
  drop column if exists sub_vendor_price;
