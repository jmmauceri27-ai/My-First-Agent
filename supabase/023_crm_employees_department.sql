-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Adds a department to each employee (e.g. Facility Services, Fire & Life
-- Safety) so the Network > Employees directory can group/filter by it.

alter table crm_employees
  add column if not exists department text;
