-- Fixes a real bug: Opportunity/Agreement "# of sites" was a plain editable number on the form, seeded once
-- from whatever the record already had and then written back unconditionally on every save. Uploading sites
-- correctly synced the real count in the database (via the existing site-count triggers below), but the very
-- next time someone saved that Opportunity/Agreement from the app (e.g. just changing Notes), the stale
-- number sitting in the form overwrote the freshly-synced value right back to whatever it was before the
-- upload. The application code changes accompanying this migration stop treating "# of sites" as
-- user-editable at all -- it's now purely a computed, read-only reflection of the real linked Sites.
--
-- Also adds a direct sites.contract_id link (mirroring the existing sites.opportunity_id) so an Agreement can
-- have its own "Sites" section -- bulk upload, list, remove -- exactly like an Opportunity already does,
-- instead of only inheriting sites indirectly through per-trade vendor assignments.

alter table sites
  add column if not exists contract_id uuid references crm_contracts(id) on delete set null;

create index if not exists sites_contract_id_idx on sites (contract_id);

-- Backfill: any agreement already created from an opportunity inherits that opportunity's sites directly,
-- so agreements converted before this feature existed (e.g. from a Won opportunity) get their Sites section
-- populated retroactively instead of starting empty.
update sites s
set contract_id = c.id
from crm_contracts c
where c.opportunity_id = s.opportunity_id
  and s.opportunity_id is not null
  and s.contract_id is null;

-- Recompute every agreement's site_count as the union of directly-linked sites and sites with at least one
-- trade assignment under it (the two ways a site can relate to an agreement), fixing any number left behind
-- by the stale-form-overwrite bug described above.
update crm_contracts c
set site_count = (
  select count(distinct site_id) from (
    select id as site_id from sites where contract_id = c.id
    union
    select site_id from site_trade_assignments where contract_id = c.id
  ) combined
);

-- Recompute every opportunity's site_count directly from its linked sites, for the same reason.
update crm_opportunities o
set site_count = (select count(*) from sites where opportunity_id = o.id);
