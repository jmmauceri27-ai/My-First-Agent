-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- AFTER 017_vendors.sql and 018_sites.sql, and before
-- 022_drop_legacy_opportunity_site_tables.sql.
-- Copies your existing per-opportunity site rows (crm_opportunity_sites,
-- schemaless jsonb) into the new first-class sites table, using each
-- opportunity's saved column mapping (crm_opportunity_site_bindings) to know
-- which jsonb keys hold latitude/longitude/name. Every other key on a row is
-- kept in sites.measurements so nothing is silently dropped. Safe to run more
-- than once is NOT guaranteed (it will duplicate rows) -- run it exactly once.
--
-- After running this, open Network -> Sites in the app and confirm your
-- sites show up correctly before running 022_drop_legacy_opportunity_site_tables.sql.

insert into sites (user_id, company_id, opportunity_id, name, lat, lng, measurements)
select
  s.user_id,
  o.company_id,
  s.opportunity_id,
  coalesce(nullif(trim(both from (s.data ->> b.label_column)), ''), 'Site ' || (s.row_index + 1)) as name,
  nullif(s.data ->> b.lat_column, '')::numeric as lat,
  nullif(s.data ->> b.lng_column, '')::numeric as lng,
  (
    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
    from jsonb_each(s.data) as kv(key, value)
    where key not in (b.lat_column, b.lng_column, coalesce(b.label_column, ''))
  ) as measurements
from crm_opportunity_sites s
join crm_opportunity_site_bindings b on b.opportunity_id = s.opportunity_id
join crm_opportunities o on o.id = s.opportunity_id;
