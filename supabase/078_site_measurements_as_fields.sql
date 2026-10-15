-- Phase 1 of "everything is a field": moves Sites' hardwired measurements/counts JSONB bags into the
-- unified Fields system, as standard (is_standard = true) fields -- always shown on every site, same as
-- today, but now recognized as real Fields (visible/manageable from CRM > Custom Fields) instead of a
-- separate hardwired system. The optional/opt-in fields already migrated earlier (Palm Tree Count, Mulch
-- Color, Pine Straw, Crape Myrtle Tree Count, Other Tree Count -- all under "Site Attributes",
-- is_standard = false) are untouched; this is specifically the set that was NEVER optional.
--
-- Deliberately does NOT drop sites.measurements/sites.counts -- they're left in place, unused, as a safety
-- net until the app-side migration is confirmed working. A follow-up migration can drop them later.

do $$
declare
  v_user_id uuid;
  v_class_snow uuid;
  v_class_land uuid;
  v_class_misc uuid;
  v_class_counts uuid;
  v_field_id uuid;

  -- One (label, jsonb_column, class_id) row per field to create + backfill.
  field_spec record;
begin
  select user_id into v_user_id from sites limit 1;
  if v_user_id is null then
    raise notice 'No existing sites found -- skipping Measurements/Counts field migration.';
    return;
  end if;

  select id into v_class_snow from crm_field_classes where name = 'Snow' and user_id = v_user_id;
  if v_class_snow is null then
    insert into crm_field_classes (user_id, name, position) values (v_user_id, 'Snow', 1) returning id into v_class_snow;
  end if;

  select id into v_class_land from crm_field_classes where name = 'Land' and user_id = v_user_id;
  if v_class_land is null then
    insert into crm_field_classes (user_id, name, position) values (v_user_id, 'Land', 2) returning id into v_class_land;
  end if;

  select id into v_class_misc from crm_field_classes where name = 'Misc.' and user_id = v_user_id;
  if v_class_misc is null then
    insert into crm_field_classes (user_id, name, position) values (v_user_id, 'Misc.', 3) returning id into v_class_misc;
  end if;

  select id into v_class_counts from crm_field_classes where name = 'Counts' and user_id = v_user_id;
  if v_class_counts is null then
    insert into crm_field_classes (user_id, name, position) values (v_user_id, 'Counts', 4) returning id into v_class_counts;
  end if;

  for field_spec in
    select * from (values
      ('parking_lot',    'Parking Lot',    'measurements', v_class_snow,   0),
      ('sidewalk',       'Sidewalk',       'measurements', v_class_snow,   1),
      ('public_walk',    'Public Walk',    'measurements', v_class_snow,   2),
      ('turf_area',      'Turf Area',      'measurements', v_class_land,   0),
      ('bed_space',      'Bed Space',      'measurements', v_class_land,   1),
      ('hedges',         'Hedges',         'measurements', v_class_land,   2),
      ('native_mow',     'Native Mow',     'measurements', v_class_land,   3),
      ('retention_wall', 'Retention Wall', 'measurements', v_class_misc,   0),
      ('rock_bed',       'Rock Bed',       'measurements', v_class_misc,   1),
      ('deciduous_tree', 'Deciduous Tree', 'counts',       v_class_counts, 0),
      ('shrubs',         'Shrubs',         'counts',       v_class_counts, 1)
    ) as t(field_name, label, bag_column, class_id, field_position)
  loop
    select id into v_field_id from crm_fields where name = field_spec.field_name;
    if v_field_id is null then
      insert into crm_fields (user_id, class_id, name, label, field_type, is_standard, position)
      values (v_user_id, field_spec.class_id, field_spec.field_name, field_spec.label, 'Number', true, field_spec.field_position)
      returning id into v_field_id;
    end if;

    if field_spec.bag_column = 'measurements' then
      insert into crm_field_values (user_id, field_id, record_id, value)
      select v_user_id, v_field_id, id, (measurements ->> field_spec.label)
      from sites
      where user_id = v_user_id and measurements ? field_spec.label and (measurements ->> field_spec.label) is not null
      on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();
    else
      insert into crm_field_values (user_id, field_id, record_id, value)
      select v_user_id, v_field_id, id, (counts ->> field_spec.label)
      from sites
      where user_id = v_user_id and counts ? field_spec.label and (counts ->> field_spec.label) is not null
      on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();
    end if;
  end loop;
end $$;
