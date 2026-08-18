-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Adds a second vendor layer to Sites: the existing Vendor is who the site is
-- contracted to directly; the new Sub-Vendor is who that Vendor further
-- subcontracts the work out to. This lets a site's price chain be tracked in
-- two steps -- our company to the Vendor (contract_value - sub_price, already
-- tracked), then the Vendor to the Sub-Vendor (sub_price - sub_vendor_price).

alter table sites
  add column if not exists sub_vendor_id uuid references vendors(id) on delete set null,
  add column if not exists sub_vendor_price numeric;

create index if not exists sites_sub_vendor_id_idx on sites (sub_vendor_id);
