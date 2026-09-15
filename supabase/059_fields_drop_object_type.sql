-- Classes and Fields are no longer scoped to one CRM object type (Company/Contact/Opportunity/Contract/
-- Site). A class just holds fields, full stop, and every class/field is now usable on any record type --
-- opportunities, agreements, sites, clients, and contacts alike (which record a field's *value* belongs to
-- is still just crm_field_values.record_id, unaffected by this).
--
-- Dropping object_type from crm_field_classes also drops its index (crm_field_classes_object_type_idx).
-- Dropping it from crm_fields also drops its index (crm_fields_object_type_idx) and the old
-- unique(object_type, name) constraint, replaced below with a plain unique(name) -- a field's internal key
-- is now a single global namespace instead of one per object type.
--
-- If the new unique(name) add fails, two existing fields share the same internal name across what used to
-- be different object types (e.g. a "Notes" field under both Contact and Site) -- a field's internal name
-- is set once at creation and not editable from the UI, so resolve the clash directly in SQL first (e.g.
-- `update crm_fields set name = 'notes_2' where id = '<the-duplicate-one>'`) and re-run this migration.

alter table crm_field_classes drop column if exists object_type;

alter table crm_fields drop column if exists object_type;
alter table crm_fields add constraint crm_fields_name_key unique (name);
