-- Annual Rate Total used to be independently entered (and bulk-uploadable), tracked separately from the
-- month-by-month Rate Schedule on purpose. It's now always computed as the sum of Rate Schedule's monthly
-- amounts instead (see saveSiteTradeAssignments and bulkUpdateSiteRateSchedule in src/lib/networkDal.ts) --
-- this recomputes every existing row so historical data matches the new rule immediately, rather than only
-- becoming correct the next time each site happens to be re-saved.

update site_trade_assignments t
set annual_rate_total = coalesce(
  (select sum((kv.value)::numeric) from jsonb_each_text(t.rate_schedule) as kv),
  0
),
updated_at = now();
