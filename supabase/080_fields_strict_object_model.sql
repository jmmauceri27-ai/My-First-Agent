-- Reworks Fields/Classes from "usable on any record type, custom ones opt-in per individual record" into a
-- strict HubSpot-style Properties/Property Groups model: every class ("group") and field ("property") belongs
-- to exactly one record type, and once a field exists it's available on EVERY record of that type (blank
-- until a value is entered) -- there is no more per-record attach step. A field needed on two record types is
-- now two separate fields, one per type, same as HubSpot ("a property created on Companies doesn't exist on
-- Contacts -- if you need it on both, you create it twice").
--
-- This replaces 079's optional/nullable record_type (added to stop Site-only standard fields leaking onto
-- every record type) with a REQUIRED one, and removes the is_standard/crm_field_assignments distinction
-- entirely -- every field now behaves the way is_standard = true fields always did.
--
-- Safe to re-run. If any class can't be resolved to exactly one record type (see step 2), this raises an
-- exception and changes nothing -- resolve it by hand (see the notice) and re-run.

-- Step 1: crm_fields gets its own record_type too (denormalized from its class) so uniqueness and lookups
-- don't require a join. Nullable for now; made NOT NULL once every row is backfilled below.
alter table crm_fields add column if not exists record_type text;

-- Step 2: backfill crm_field_classes.record_type for any class 079 didn't already tag (i.e. every class that
-- isn't Snow/Land/Misc./Counts/Site Attributes), by checking which single record type its fields have ever
-- actually been attached to via crm_field_assignments. A class with no assignments yet, or assignments
-- spanning more than one record type, can't be resolved automatically.
do $$
declare
  cls record;
  resolved_types text[];
begin
  for cls in select id, name from crm_field_classes where record_type is null loop
    select array_agg(distinct rt) into resolved_types
    from (
      select
        case
          when exists (select 1 from sites s where s.id = cfa.record_id) then 'Site'
          when exists (select 1 from crm_contacts c where c.id = cfa.record_id) then 'Contact'
          when exists (select 1 from crm_companies c where c.id = cfa.record_id) then 'Company'
          when exists (select 1 from crm_opportunities o where o.id = cfa.record_id) then 'Opportunity'
          when exists (select 1 from crm_contracts c where c.id = cfa.record_id) then 'Agreement'
          when exists (select 1 from vendors v where v.id = cfa.record_id) then 'Vendor'
          when exists (select 1 from crm_employees e where e.id = cfa.record_id) then 'Employee'
        end as rt
      from crm_field_assignments cfa
      join crm_fields f on f.id = cfa.field_id
      where f.class_id = cls.id
    ) resolved
    where rt is not null;

    if resolved_types is not null and array_length(resolved_types, 1) = 1 then
      update crm_field_classes set record_type = resolved_types[1] where id = cls.id;
      raise notice 'Class "%" (%) resolved to record_type %', cls.name, cls.id, resolved_types[1];
    else
      raise notice 'Class "%" (%) could NOT be auto-resolved (% distinct record types found) -- set it manually: update crm_field_classes set record_type = ''Site|Company|Contact|Opportunity|Agreement|Vendor|Employee'' where id = ''%''; then re-run this migration.',
        cls.name, cls.id, coalesce(array_length(resolved_types, 1), 0), cls.id;
    end if;
  end loop;

  if exists (select 1 from crm_field_classes where record_type is null) then
    raise exception 'One or more field classes could not be auto-resolved to a single record type -- see the notices above, resolve each by hand, then re-run this migration. Nothing else was changed.';
  end if;
end $$;

-- Step 3: cascade record_type down from each class to its fields.
update crm_fields f
set record_type = c.record_type
from crm_field_classes c
where c.id = f.class_id and f.record_type is distinct from c.record_type;

-- Step 4: enforce the model -- every class/field now always belongs to exactly one record type.
alter table crm_field_classes alter column record_type set not null;
alter table crm_fields alter column record_type set not null;

-- Step 5: a field's internal name only needs to be unique within its own record type now (same name can be
-- reused across two different record types' own separate fields), replacing the old single global namespace.
alter table crm_fields drop constraint if exists crm_fields_name_key;
alter table crm_fields add constraint crm_fields_record_type_name_key unique (record_type, name);

-- Step 6: is_standard and crm_field_assignments no longer mean anything -- every field on a record-type-scoped
-- class now always shows on every record of that type, same as is_standard = true fields always did.
alter table crm_fields drop column if exists is_standard;
drop table if exists crm_field_assignments;
