-- Moves "Crape Myrtle Tree Count" and "Other Tree Count" out of the fixed, always-present Counts list (every
-- site shows every fixed Count field, blank or not) and into the Custom Fields system instead -- shown in
-- CRM > Custom Fields for management, and only appearing on a site once actually attached to it (via the
-- site's own edit screen, or Network > Sites > Update > Custom fields in bulk), so it reads as optional
-- rather than something every site is expected to have. Reuses the "Site Attributes" class 075 creates;
-- re-creates it here too in case 075 hasn't run yet, so this migration doesn't depend on run order.

do $$
declare
  v_user_id uuid;
  v_class_id uuid;
begin
  select user_id into v_user_id from sites limit 1;
  if v_user_id is null then
    raise notice 'No existing sites found -- skipping tree-count Custom Field setup.';
    return;
  end if;

  select id into v_class_id
  from crm_field_classes
  where name = 'Site Attributes' and user_id = v_user_id;

  if v_class_id is null then
    insert into crm_field_classes (user_id, name, position)
    values (v_user_id, 'Site Attributes', 0)
    returning id into v_class_id;
  end if;

  insert into crm_fields (user_id, class_id, name, label, field_type, is_standard, position)
  values (v_user_id, v_class_id, 'crape_myrtle_tree_count', 'Crape Myrtle Tree Count', 'Number', false, 2)
  on conflict (name) do nothing;

  insert into crm_fields (user_id, class_id, name, label, field_type, is_standard, position)
  values (v_user_id, v_class_id, 'other_tree_count', 'Other Tree Count', 'Number', false, 3)
  on conflict (name) do nothing;
end $$;
