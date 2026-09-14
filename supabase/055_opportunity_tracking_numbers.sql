-- Gives every Opportunity a permanent, sequential tracking number (T-0001, T-0002, ...), assigned once at
-- creation and never reassigned. A Contract can optionally record which Opportunity it came from
-- (opportunity_id) -- picking one on the Contract form copies that opportunity's tracking number onto the
-- contract permanently, so it stays even if the contract's source opportunity link is later changed or
-- cleared.

create sequence if not exists crm_opportunity_tracking_seq;

alter table crm_opportunities add column if not exists tracking_number text;

-- Backfill existing opportunities in creation order so tracking numbers reflect how old each deal is.
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from crm_opportunities
  where tracking_number is null
)
update crm_opportunities o
set tracking_number = 'T-' || lpad(ordered.rn::text, 4, '0')
from ordered
where o.id = ordered.id;

-- Advance the sequence past every number just backfilled so the next new opportunity continues from there.
select setval('crm_opportunity_tracking_seq', greatest((select count(*) from crm_opportunities), 1), true);

alter table crm_opportunities alter column tracking_number set default ('T-' || lpad(nextval('crm_opportunity_tracking_seq')::text, 4, '0'));
alter table crm_opportunities alter column tracking_number set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_opportunities_tracking_number_key'
  ) then
    alter table crm_opportunities add constraint crm_opportunities_tracking_number_key unique (tracking_number);
  end if;
end $$;

alter table crm_contracts add column if not exists opportunity_id uuid references crm_opportunities(id) on delete set null;
alter table crm_contracts add column if not exists tracking_number text;

create index if not exists crm_contracts_opportunity_id_idx on crm_contracts (opportunity_id);
