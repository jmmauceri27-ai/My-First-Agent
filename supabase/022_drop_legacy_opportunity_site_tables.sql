-- Run this LAST, only after running 019_migrate_opportunity_sites_to_sites.sql
-- and confirming your opportunity sites show up correctly under
-- Network -> Sites in the app. This permanently drops the old per-opportunity
-- site storage, now replaced by the shared sites table.

drop table if exists crm_opportunity_sites;
drop table if exists crm_opportunity_site_bindings;
