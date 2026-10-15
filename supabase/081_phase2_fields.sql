-- Phase 2 of "everything is a field": moves Company/Contact/Opportunity/Agreement's attribute-style columns
-- into the unified Fields system, same pattern as Phase 1 (078) did for Sites' Measurements/Counts.
--
-- In scope: Company.website/notes, Contact.email/phone/title/notes/canApproveWork/approvalLimit/region,
-- Opportunity.notes, Agreement.notes. Contract.startDate stays a real column (deferred to Phase 3 to be
-- mirrored alongside endDate, since both are used together by the Agreements timeline and dashboards).
--
-- Deliberately does NOT drop the old columns (crm_companies.website/notes, crm_contacts.email/phone/title/
-- notes/can_approve_work/approval_limit/region, crm_opportunities.notes, crm_contracts.notes) -- left in
-- place, unused, as a safety net until the app-side migration is confirmed working, same as 078.
--
-- Safe to re-run -- every class/field lookup is by (name, record_type), and every backfill is an upsert.

do $$
declare
  v_user_id uuid;
  v_class_company uuid;
  v_class_contact uuid;
  v_class_opportunity uuid;
  v_class_agreement uuid;
  v_field_id uuid;
begin
  select user_id into v_user_id from crm_companies limit 1;
  if v_user_id is null then
    select user_id into v_user_id from crm_contacts limit 1;
  end if;
  if v_user_id is null then
    raise notice 'No existing Companies or Contacts found -- skipping Phase 2 field migration.';
    return;
  end if;

  -- ---------- Company ----------
  select id into v_class_company from crm_field_classes where name = 'Company Info' and record_type = 'Company' and user_id = v_user_id;
  if v_class_company is null then
    insert into crm_field_classes (user_id, name, record_type, position)
    values (v_user_id, 'Company Info', 'Company', 0) returning id into v_class_company;
  end if;

  select id into v_field_id from crm_fields where name = 'website' and record_type = 'Company';
  if v_field_id is null then
    insert into crm_fields (user_id, class_id, name, label, field_type, record_type, position)
    values (v_user_id, v_class_company, 'website', 'Website', 'Text', 'Company', 0) returning id into v_field_id;
  end if;
  insert into crm_field_values (user_id, field_id, record_id, value)
  select v_user_id, v_field_id, id, website from crm_companies
  where user_id = v_user_id and website is not null and website <> ''
  on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();

  select id into v_field_id from crm_fields where name = 'notes' and record_type = 'Company';
  if v_field_id is null then
    insert into crm_fields (user_id, class_id, name, label, field_type, record_type, position)
    values (v_user_id, v_class_company, 'notes', 'Notes', 'Multi-line Text', 'Company', 1) returning id into v_field_id;
  end if;
  insert into crm_field_values (user_id, field_id, record_id, value)
  select v_user_id, v_field_id, id, notes from crm_companies
  where user_id = v_user_id and notes is not null and notes <> ''
  on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();

  -- ---------- Contact ----------
  select id into v_class_contact from crm_field_classes where name = 'Contact Info' and record_type = 'Contact' and user_id = v_user_id;
  if v_class_contact is null then
    insert into crm_field_classes (user_id, name, record_type, position)
    values (v_user_id, 'Contact Info', 'Contact', 0) returning id into v_class_contact;
  end if;

  select id into v_field_id from crm_fields where name = 'email' and record_type = 'Contact';
  if v_field_id is null then
    insert into crm_fields (user_id, class_id, name, label, field_type, record_type, position)
    values (v_user_id, v_class_contact, 'email', 'Email', 'Text', 'Contact', 0) returning id into v_field_id;
  end if;
  insert into crm_field_values (user_id, field_id, record_id, value)
  select v_user_id, v_field_id, id, email from crm_contacts
  where user_id = v_user_id and email is not null and email <> ''
  on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();

  select id into v_field_id from crm_fields where name = 'phone' and record_type = 'Contact';
  if v_field_id is null then
    insert into crm_fields (user_id, class_id, name, label, field_type, record_type, position)
    values (v_user_id, v_class_contact, 'phone', 'Phone', 'Text', 'Contact', 1) returning id into v_field_id;
  end if;
  insert into crm_field_values (user_id, field_id, record_id, value)
  select v_user_id, v_field_id, id, phone from crm_contacts
  where user_id = v_user_id and phone is not null and phone <> ''
  on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();

  select id into v_field_id from crm_fields where name = 'title' and record_type = 'Contact';
  if v_field_id is null then
    insert into crm_fields (user_id, class_id, name, label, field_type, record_type, position)
    values (v_user_id, v_class_contact, 'title', 'Title', 'Text', 'Contact', 2) returning id into v_field_id;
  end if;
  insert into crm_field_values (user_id, field_id, record_id, value)
  select v_user_id, v_field_id, id, title from crm_contacts
  where user_id = v_user_id and title is not null and title <> ''
  on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();

  select id into v_field_id from crm_fields where name = 'region' and record_type = 'Contact';
  if v_field_id is null then
    insert into crm_fields (user_id, class_id, name, label, field_type, record_type, position)
    values (v_user_id, v_class_contact, 'region', 'Region', 'Text', 'Contact', 3) returning id into v_field_id;
  end if;
  insert into crm_field_values (user_id, field_id, record_id, value)
  select v_user_id, v_field_id, id, region from crm_contacts
  where user_id = v_user_id and region is not null and region <> ''
  on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();

  select id into v_field_id from crm_fields where name = 'can_approve_work' and record_type = 'Contact';
  if v_field_id is null then
    insert into crm_fields (user_id, class_id, name, label, field_type, record_type, position)
    values (v_user_id, v_class_contact, 'can_approve_work', 'Approves work', 'Checkbox', 'Contact', 4) returning id into v_field_id;
  end if;
  -- Backfilled unconditionally (not just when true) -- can_approve_work is a NOT NULL column, so "false" is
  -- just as real a value as "true", not a blank/unset one.
  insert into crm_field_values (user_id, field_id, record_id, value)
  select v_user_id, v_field_id, id, can_approve_work::text from crm_contacts
  where user_id = v_user_id
  on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();

  select id into v_field_id from crm_fields where name = 'approval_limit' and record_type = 'Contact';
  if v_field_id is null then
    insert into crm_fields (user_id, class_id, name, label, field_type, record_type, position)
    values (v_user_id, v_class_contact, 'approval_limit', 'Approval Limit', 'Number', 'Contact', 5) returning id into v_field_id;
  end if;
  insert into crm_field_values (user_id, field_id, record_id, value)
  select v_user_id, v_field_id, id, approval_limit::text from crm_contacts
  where user_id = v_user_id and approval_limit is not null
  on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();

  select id into v_field_id from crm_fields where name = 'notes' and record_type = 'Contact';
  if v_field_id is null then
    insert into crm_fields (user_id, class_id, name, label, field_type, record_type, position)
    values (v_user_id, v_class_contact, 'notes', 'Notes', 'Multi-line Text', 'Contact', 6) returning id into v_field_id;
  end if;
  insert into crm_field_values (user_id, field_id, record_id, value)
  select v_user_id, v_field_id, id, notes from crm_contacts
  where user_id = v_user_id and notes is not null and notes <> ''
  on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();

  -- ---------- Opportunity ----------
  select id into v_class_opportunity from crm_field_classes where name = 'Opportunity Info' and record_type = 'Opportunity' and user_id = v_user_id;
  if v_class_opportunity is null then
    insert into crm_field_classes (user_id, name, record_type, position)
    values (v_user_id, 'Opportunity Info', 'Opportunity', 0) returning id into v_class_opportunity;
  end if;

  select id into v_field_id from crm_fields where name = 'notes' and record_type = 'Opportunity';
  if v_field_id is null then
    insert into crm_fields (user_id, class_id, name, label, field_type, record_type, position)
    values (v_user_id, v_class_opportunity, 'notes', 'Notes', 'Multi-line Text', 'Opportunity', 0) returning id into v_field_id;
  end if;
  insert into crm_field_values (user_id, field_id, record_id, value)
  select v_user_id, v_field_id, id, notes from crm_opportunities
  where user_id = v_user_id and notes is not null and notes <> ''
  on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();

  -- ---------- Agreement (crm_contracts) ----------
  select id into v_class_agreement from crm_field_classes where name = 'Agreement Info' and record_type = 'Agreement' and user_id = v_user_id;
  if v_class_agreement is null then
    insert into crm_field_classes (user_id, name, record_type, position)
    values (v_user_id, 'Agreement Info', 'Agreement', 0) returning id into v_class_agreement;
  end if;

  select id into v_field_id from crm_fields where name = 'notes' and record_type = 'Agreement';
  if v_field_id is null then
    insert into crm_fields (user_id, class_id, name, label, field_type, record_type, position)
    values (v_user_id, v_class_agreement, 'notes', 'Notes', 'Multi-line Text', 'Agreement', 0) returning id into v_field_id;
  end if;
  insert into crm_field_values (user_id, field_id, record_id, value)
  select v_user_id, v_field_id, id, notes from crm_contracts
  where user_id = v_user_id and notes is not null and notes <> ''
  on conflict (field_id, record_id) do update set value = excluded.value, updated_at = now();
end $$;
