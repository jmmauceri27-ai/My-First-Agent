-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Lets you choose which dataset columns show up as filter groups in the
-- Procurement site map's sidebar (instead of showing every column).

alter table site_map_bindings
  add column if not exists filter_columns jsonb not null default '[]';
