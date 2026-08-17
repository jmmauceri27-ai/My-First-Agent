-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Adds City, State, and Zip as their own fields on a site (separate from the
-- free-text Address field), so they can be captured from an uploaded sheet's
-- own City/State/Zip columns and searched on directly.

alter table sites
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists zip text;
