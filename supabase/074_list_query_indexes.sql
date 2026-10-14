-- Every list*() DAL function filters by user_id (single-tenant) and orders by one fixed column, on every
-- page load -- sites by name, vendors by name, crm_companies by name, crm_contacts by name, crm_employees by
-- name, crm_contracts by end_date, crm_opportunities by position. None of those sort columns had a
-- supporting index, so Postgres was doing a full scan + in-memory sort on every single fetch instead of an
-- index-ordered scan. These composite indexes let it read rows already in the needed order.
create index if not exists sites_user_id_name_idx on sites (user_id, name);
create index if not exists vendors_user_id_name_idx on vendors (user_id, name);
create index if not exists crm_companies_user_id_name_idx on crm_companies (user_id, name);
create index if not exists crm_contacts_user_id_name_idx on crm_contacts (user_id, name);
create index if not exists crm_employees_user_id_name_idx on crm_employees (user_id, name);
create index if not exists crm_contracts_user_id_end_date_idx on crm_contracts (user_id, end_date);
create index if not exists crm_opportunities_user_id_position_idx on crm_opportunities (user_id, position);
