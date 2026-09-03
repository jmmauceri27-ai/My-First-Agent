-- Client-specific rate cards: a real contract (e.g. a subcontractor MSA) can hand you dollar rates that
-- differ from the generic per-trade catalog. company_id is nullable -- null means the generic, company-wide
-- item (unchanged behavior for existing rows); set means it belongs to one client's own rate card, which the
-- Proposal Assistant and Calculator prefer over the generic catalog for that trade when present.
alter table rate_items add column if not exists company_id uuid references crm_companies(id) on delete cascade;

create index if not exists rate_items_company_id_idx on rate_items (company_id);
