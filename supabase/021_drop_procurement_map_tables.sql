-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- AFTER the Network hub migrations (017-020) and after confirming the app's
-- nav no longer has a Procurement tab. Drops the old Procurement
-- dataset-driven Site Map / Vendor Prospecting Network tables, now fully
-- replaced by the first-class vendors/sites tables. Safe: these only ever
-- referenced Procurement datasets, which have already been deleted.

drop table if exists site_map_views;
drop table if exists site_map_bindings;
drop table if exists vendor_map_views;
drop table if exists vendor_map_bindings;
