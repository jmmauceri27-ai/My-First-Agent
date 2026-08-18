-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Adds a user-entered "Site ID" -- a custom code/identifier you assign
-- yourself (e.g. a facility code from your own system), separate from the
-- database's own auto-generated record id.

alter table sites add column if not exists site_code text;

create index if not exists sites_site_code_idx on sites (site_code);
