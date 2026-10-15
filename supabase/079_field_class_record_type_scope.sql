-- Fixes a real bug exposed by 078: Fields/Classes were made fully record-type-agnostic back in
-- 059_fields_drop_object_type.sql (any class/field usable on any record type), which was fine as long as
-- every field was either opt-in (is_standard = false, so it only ever shows on a record once explicitly
-- attached to THAT record) or, before 078, there simply weren't any NEW standard fields being added. 078
-- created the first new is_standard = true fields since that change (Snow/Land/Misc./Counts), and standard
-- fields render unconditionally on every record using DynamicFieldsSection, regardless of record type --
-- so Sites' Measurements fields started appearing on Contacts, Companies, Vendors, Employees, Opportunities,
-- and Agreements too.
--
-- Adds an optional record_type tag to crm_field_classes: null means "universal" (keeps today's behavior,
-- shows everywhere, used for any class that's genuinely meant to be shared across record types), a specific
-- value scopes a class's fields to that one record type's own page only. Tags the 5 classes 078/075/076/077
-- created as 'Site'.

alter table crm_field_classes add column if not exists record_type text;

update crm_field_classes
set record_type = 'Site'
where name in ('Snow', 'Land', 'Misc.', 'Counts', 'Site Attributes') and record_type is null;
