-- Reverses migration 051: "Submission Due Date" should not appear in the Fields/Classes admin screen at
-- all -- it stays exactly as it's always worked on the CRM opportunity screens (the real
-- crm_opportunities.expected_close_date column, untouched by this migration). Going forward, every field
-- added through the Fields screen is Custom (per-record opt-in) rather than a Standard field mirroring a
-- built-in column, so this one-off mirrored field/class is removed rather than kept as a precedent.
--
-- Deleting the field cascades to its crm_field_values rows (field_id references crm_fields on delete
-- cascade) -- harmless, since that data only ever mirrored crm_opportunities.expected_close_date, which is
-- untouched here.

do $$
declare
  v_class_id uuid;
begin
  delete from crm_fields where object_type = 'Opportunity' and name = 'submission_due_date';

  select id into v_class_id
  from crm_field_classes
  where object_type = 'Opportunity' and name = 'Opportunity Details';

  if v_class_id is not null and not exists (select 1 from crm_fields where class_id = v_class_id) then
    delete from crm_field_classes where id = v_class_id;
  end if;
end $$;
