-- Registers the Opportunity's existing "Submission Due Date" (the crm_opportunities.expected_close_date
-- column) as a real Field under a Class in the Fields/Classes system, and backfills crm_field_values from
-- every existing opportunity's current value -- purely additive: the column itself is untouched and stays
-- the source of truth for the Kanban board, the opportunity detail page, and the dashboard on-time-rate KPI.
-- The app layer (crmDal.createOpportunity/updateOpportunity) keeps this field's value mirrored on every
-- future save.

do $$
declare
  v_user_id uuid;
  v_class_id uuid;
  v_field_id uuid;
begin
  select user_id into v_user_id from crm_opportunities limit 1;
  if v_user_id is null then
    raise notice 'No existing opportunities found -- skipping Submission Due Date field setup.';
    return;
  end if;

  select id into v_class_id
  from crm_field_classes
  where object_type = 'Opportunity' and name = 'Opportunity Details' and user_id = v_user_id;

  if v_class_id is null then
    insert into crm_field_classes (user_id, object_type, name, position)
    values (v_user_id, 'Opportunity', 'Opportunity Details', 0)
    returning id into v_class_id;
  end if;

  select id into v_field_id
  from crm_fields
  where object_type = 'Opportunity' and name = 'submission_due_date';

  if v_field_id is null then
    insert into crm_fields (user_id, object_type, class_id, name, label, field_type, position)
    values (v_user_id, 'Opportunity', v_class_id, 'submission_due_date', 'Submission Due Date', 'Date', 0)
    returning id into v_field_id;
  end if;

  insert into crm_field_values (user_id, field_id, record_id, value)
  select v_user_id, v_field_id, id, expected_close_date::text
  from crm_opportunities
  where expected_close_date is not null
  on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();
end $$;
