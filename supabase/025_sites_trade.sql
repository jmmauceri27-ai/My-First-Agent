-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Adds a Trade to each site (e.g. Snow Removal, Fire & Life Safety) so the
-- Network > Sites screen can filter/color by it. When sites are linked to
-- an Opportunity or Contract, their Trade defaults to that record's
-- existing "Type of work" field.

alter table sites
  add column if not exists trade text;
