-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Lets the Site Map link a site's vendor-name column to a row in another
-- dataset (e.g. "Snow Vendors"), so clicking that field on a site opens a
-- read-only detail panel for the matched vendor.

alter table site_map_bindings
  add column if not exists vendor_link_column text,
  add column if not exists vendor_link_dataset_id uuid references datasets(id) on delete set null,
  add column if not exists vendor_link_key_column text;
