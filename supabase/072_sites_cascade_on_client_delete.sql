-- A site can't meaningfully exist without its Client -- it's a parent/child relationship, not an optional
-- link. sites.company_id was "on delete set null", so deleting a Client silently orphaned its sites instead of
-- removing them, leaving client-less sites cluttering the Sites screen. Switches it to "on delete cascade":
-- deleting a Client now deletes every site tied to it too (and, via the existing cascade on
-- site_trade_assignments.site_id, each of those sites' trade assignments/vendor pricing/rate schedules along
-- with them). The app's own delete-client flow warns about this and asks for confirmation before deleting --
-- this migration only changes what the database itself does once that delete actually happens.
--
-- This does NOT retroactively touch any site that's already client-less from a Client deleted before this
-- migration ran -- those are a separate, one-time cleanup (see the app for a list of them).

alter table sites drop constraint if exists sites_company_id_fkey;

alter table sites
  add constraint sites_company_id_fkey foreign key (company_id) references crm_companies(id) on delete cascade;
