-- Retires the generic upload-driven dashboard pipeline now that Dashboards
-- pulls directly from CRM/Network tables (see src/lib/dashboardSources.ts).
-- Never run automatically -- paste into the Supabase SQL editor once the
-- app code that stops referencing these tables is deployed.

drop table if exists template_bindings;
drop table if exists dataset_rows;
drop table if exists datasets;
drop table if exists upload_chunks;

-- Existing dashboard configs reference dataset ids that no longer exist;
-- per the decision to start fresh, clear them rather than migrate.
delete from dashboards;
