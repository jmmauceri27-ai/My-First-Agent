-- Step 1 of the proposal builder: the rate card data the pricing engine (and, later, the AI chat) will draw
-- from. rate_rules holds each trade's default pricing formula; client_rate_overrides lets a specific client's
-- negotiated rate for a trade take precedence over that default when present.

create table if not exists rate_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  trade text not null,
  pricing_basis text not null,
  base_rate numeric not null,
  unit_label text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rate_rules_trade_idx on rate_rules (trade);

alter table rate_rules enable row level security;

create policy "Users manage their own rate rules"
  on rate_rules for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists client_rate_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_id uuid not null references crm_companies(id) on delete cascade,
  trade text not null,
  override_type text not null,
  override_value numeric not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, trade)
);

create index if not exists client_rate_overrides_company_id_idx on client_rate_overrides (company_id);

alter table client_rate_overrides enable row level security;

create policy "Users manage their own client rate overrides"
  on client_rate_overrides for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
