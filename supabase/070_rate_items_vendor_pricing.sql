-- Rate items only ever tracked what we charge a client (rate) -- there was no way to record what we pay a
-- vendor for that same line item, so the rate card couldn't show cost/margin alongside the client price.
-- Adds an optional vendor_id (which vendor, if any, is costed for this item) and vendor_rate (what we pay them
-- for the same unit the client rate is priced on). Both nullable -- a rate item with no vendor yet behaves
-- exactly as before.

alter table rate_items
  add column if not exists vendor_id uuid references vendors(id) on delete set null,
  add column if not exists vendor_rate numeric;

create index if not exists rate_items_vendor_id_idx on rate_items (vendor_id);
