-- Moves "Palm Trees" out of the fixed, always-present Counts list and into the Custom Fields system, same as
-- 076 did for Crape Myrtle Tree Count / Other Tree Count -- renamed "Palm Tree Count" to match that pair's
-- naming. Unlike those two (brand new, no existing data), sites can already have a real "Palm Trees" count
-- stored, so this backfills: every site with one gets the new field attached and its value carried over, then
-- the old counts key is removed so it doesn't show up twice (once in the old fixed list, once as a Custom
-- Field). Re-creates the "Site Attributes" class here too in case 075/076 haven't run yet.

do $$
declare
  v_user_id uuid;
  v_class_id uuid;
  v_field_id uuid;
begin
  select user_id into v_user_id from sites limit 1;
  if v_user_id is null then
    raise notice 'No existing sites found -- skipping Palm Tree Count field setup.';
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

  select id into v_field_id from crm_fields where name = 'palm_tree_count';
  if v_field_id is null then
    insert into crm_fields (user_id, class_id, name, label, field_type, is_standard, position)
    values (v_user_id, v_class_id, 'palm_tree_count', 'Palm Tree Count', 'Number', false, 4)
    returning id into v_field_id;
  end if;

  -- Backfill: every site with an existing "Palm Trees" count gets this field attached, with that count
  -- carried over as its value.
  insert into crm_field_assignments (user_id, field_id, record_id)
  select v_user_id, v_field_id, id
  from sites
  where user_id = v_user_id and counts ? 'Palm Trees' and (counts ->> 'Palm Trees') is not null
  on conflict (field_id, record_id) do nothing;

  insert into crm_field_values (user_id, field_id, record_id, value)
  select v_user_id, v_field_id, id, (counts ->> 'Palm Trees')
  from sites
  where user_id = v_user_id and counts ? 'Palm Trees' and (counts ->> 'Palm Trees') is not null
  on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();

  update sites
  set counts = counts - 'Palm Trees', updated_at = now()
  where user_id = v_user_id and counts ? 'Palm Trees';
end $$;
