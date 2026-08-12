-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Gives crm_employees real contact fields so the new Network > Employees
-- directory has more to show than just a name.

alter table crm_employees
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists title text;
