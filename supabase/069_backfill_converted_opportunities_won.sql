-- Retroactively marks Won every opportunity that already has a linked agreement (crm_contracts.opportunity_id)
-- but was never itself flipped to "Won" -- the gap createContract() now closes going forward (see
-- markOpportunityWon in src/lib/crmDal.ts): converting an opportunity straight into an agreement (the
-- "Convert to Agreement" button, or attaching an opportunity when creating one directly) created the contract
-- without ever touching the opportunity's own stage. That left it off the Pipeline board entirely -- it reads
-- as "converted" per listConvertedOpportunityIds(), but not stage = 'Won', and src/app/crm/page.tsx filters out
-- exactly that combination.
--
-- This is the general version of the one-off fix in 058_mark_regal_opportunities_won.sql (which hand-patched
-- two specific opportunities by tracking number). Loops one opportunity at a time, in original creation order,
-- so each gets its own next position appended to the end of the Won column.

do $$
declare
  rec record;
  next_position integer;
begin
  select coalesce(max(position), -1) into next_position from crm_opportunities where stage = 'Won';

  for rec in
    select distinct o.id
    from crm_opportunities o
    join crm_contracts c on c.opportunity_id = o.id
    where o.stage <> 'Won'
    order by o.created_at
  loop
    next_position := next_position + 1;

    update crm_opportunities
    set stage = 'Won',
        position = next_position,
        updated_at = now()
    where id = rec.id;
  end loop;
end $$ language plpgsql;
