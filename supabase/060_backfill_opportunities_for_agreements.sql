-- Retroactively creates a Won opportunity for every existing agreement that doesn't already have one, so it
-- shows up in the Won column on the Pipeline board (and in the Pipeline Overview dashboard) like every
-- agreement created through the normal "Won -> auto-agreement" flow going forward. Loops one contract at a
-- time (rather than a single INSERT ... SELECT) so each new opportunity's id can be linked straight back
-- onto its own source contract -- a set-based insert has no reliable way to recover that pairing afterward.
--
-- Field mapping, since Contract and Opportunity don't line up one-to-one: contract's name/company/site count
-- carry over directly; rate_amount becomes the opportunity's amount (its closest equivalent -- Opportunity
-- has no separate "recurring rate" concept); work_type (a single value) becomes a one-item trades array.
-- expected_close_date and sales_manager_id have no equivalent on a signed contract, so they're left blank.

do $$
declare
  rec record;
  new_opportunity_id uuid;
  next_position integer;
begin
  select coalesce(max(position), -1) into next_position from crm_opportunities where stage = 'Won';

  for rec in
    select * from crm_contracts where opportunity_id is null order by created_at
  loop
    next_position := next_position + 1;

    insert into crm_opportunities (
      user_id, name, company_id, stage, amount, site_count, trades, notes, position
    ) values (
      rec.user_id,
      rec.name,
      rec.company_id,
      'Won',
      rec.rate_amount,
      rec.site_count,
      case when rec.work_type is not null and rec.work_type <> '' then array[rec.work_type] else '{}'::text[] end,
      rec.notes,
      next_position
    )
    returning id into new_opportunity_id;

    update crm_contracts
    set opportunity_id = new_opportunity_id,
        tracking_number = (select tracking_number from crm_opportunities where id = new_opportunity_id)
    where id = rec.id;
  end loop;
end $$ language plpgsql;
