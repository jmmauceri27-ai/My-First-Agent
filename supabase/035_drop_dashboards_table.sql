-- Dashboard configs are now defined in code (src/lib/dashboardDefinitions.ts)
-- instead of being built and saved through a UI, so the dashboards table is
-- no longer read or written by the app. Never run automatically -- paste
-- into the Supabase SQL editor once the app code that stops referencing
-- this table is deployed.

drop table if exists dashboards;
