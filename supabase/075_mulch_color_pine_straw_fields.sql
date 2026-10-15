-- Adds two Custom Fields usable on Sites (Fields/Classes aren't scoped to one record type -- see
-- 059_fields_drop_object_type.sql): "Mulch Color" (free text) and "Pine Straw" (yes/no). Purely additive --
-- creating the field definitions doesn't attach or set them on any site. Requested for Truist's sites
-- specifically, but there's no per-client scoping for a field definition itself; only attach + set a value on
-- the sites that should have it, e.g. via Network > Sites > Update > Custom fields, filtered to that Client.

do $$
declare
  v_user_id uuid;
  v_class_id uuid;
begin
  select user_id into v_user_id from sites limit 1;
  if v_user_id is null then
    raise notice 'No existing sites found -- skipping Mulch Color/Pine Straw field setup.';
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
  values (v_user_id, v_class_id, 'mulch_color', 'Mulch Color', 'Text', false, 0)
  on conflict (name) do nothing;

  insert into crm_fields (user_id, class_id, name, label, field_type, is_standard, position)
  values (v_user_id, v_class_id, 'pine_straw', 'Pine Straw', 'Checkbox', false, 1)
  on conflict (name) do nothing;
end $$;
