-- One-time backfill: for sites that already have a per-trade Agreement assigned
-- (site_trade_assignments.contract_id) but whose own direct link (sites.contract_id)
-- was never stamped -- because that only happens automatically going forward, from
-- this point on -- set sites.contract_id to match, wherever all of a site's trades
-- agree on a single Agreement. Sites whose trades span zero or more than one
-- Agreement are left untouched; there's no single value to backfill there.
with site_contract as (
  select site_id, contract_id
  from (
    select
      site_id,
      contract_id,
      count(distinct contract_id) over (partition by site_id) as distinct_count
    from site_trade_assignments
    where contract_id is not null
  ) t
  where distinct_count = 1
  group by site_id, contract_id
)
update sites s
set contract_id = sc.contract_id,
    updated_at = now()
from site_contract sc
where s.id = sc.site_id
  and s.contract_id is distinct from sc.contract_id;
