-- One-time cleanup: strips out any trade value that isn't one of the app's fixed TRADE_OPTIONS
-- (Land, Snow Removal, Fire & Life Safety, HVAC, General Maintenance, Facility Maintenance,
-- Parking Lot Maintenance, Pavement, Electrical, Plumbing, Irrigation, Janitorial, Pest Control).
--
-- Every one of these columns started life as a free-text field before the app switched to the
-- TradeSelect dropdown (sites.trade pre-026, crm_opportunities/crm_contracts.work_type pre-056/061),
-- so old records can still carry a typed-in value (a typo, an old name like "Landscaping" instead of
-- "Land", etc.) that no dropdown would ever produce today.
--
-- sites/crm_opportunities/crm_contracts.trades are arrays -- invalid entries are simply dropped from
-- the array, keeping any valid trades alongside them. site_trade_assignments/rate_items/
-- client_rate_overrides key a whole row by a single trade value, so a row with an unrecognized trade
-- is deleted outright -- there's no valid trade to fall back to, and the vendor/pricing data on it was
-- already orphaned from anything the UI could show. Back up first if you want to inspect what's
-- getting removed before running this.

update sites
set trades = (
  select coalesce(array_agg(t), '{}'::text[])
  from unnest(trades) as t
  where t = any(ARRAY['Land','Snow Removal','Fire & Life Safety','HVAC','General Maintenance','Facility Maintenance','Parking Lot Maintenance','Pavement','Electrical','Plumbing','Irrigation','Janitorial','Pest Control'])
)
where trades <> '{}'::text[];

update crm_opportunities
set trades = (
  select coalesce(array_agg(t), '{}'::text[])
  from unnest(trades) as t
  where t = any(ARRAY['Land','Snow Removal','Fire & Life Safety','HVAC','General Maintenance','Facility Maintenance','Parking Lot Maintenance','Pavement','Electrical','Plumbing','Irrigation','Janitorial','Pest Control'])
)
where trades <> '{}'::text[];

update crm_contracts
set trades = (
  select coalesce(array_agg(t), '{}'::text[])
  from unnest(trades) as t
  where t = any(ARRAY['Land','Snow Removal','Fire & Life Safety','HVAC','General Maintenance','Facility Maintenance','Parking Lot Maintenance','Pavement','Electrical','Plumbing','Irrigation','Janitorial','Pest Control'])
)
where trades <> '{}'::text[];

delete from site_trade_assignments
where trade <> all(ARRAY['Land','Snow Removal','Fire & Life Safety','HVAC','General Maintenance','Facility Maintenance','Parking Lot Maintenance','Pavement','Electrical','Plumbing','Irrigation','Janitorial','Pest Control']);

delete from rate_items
where trade <> all(ARRAY['Land','Snow Removal','Fire & Life Safety','HVAC','General Maintenance','Facility Maintenance','Parking Lot Maintenance','Pavement','Electrical','Plumbing','Irrigation','Janitorial','Pest Control']);

delete from client_rate_overrides
where trade <> all(ARRAY['Land','Snow Removal','Fire & Life Safety','HVAC','General Maintenance','Facility Maintenance','Parking Lot Maintenance','Pavement','Electrical','Plumbing','Irrigation','Janitorial','Pest Control']);
