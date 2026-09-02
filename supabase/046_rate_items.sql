-- Replaces rate_rules (one flat rate per trade -- migration 045) with rate_items, a generic per-trade line-item
-- catalog: labor rates by role, equipment rates, material/plant unit prices, and flat-rate service tasks. A
-- real pricing sheet turned out to need this shape, not a single number per trade.
drop table if exists rate_rules;

create table if not exists rate_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  trade text not null,
  category text not null,
  item_name text not null,
  pricing_basis text not null,
  rate_tier text not null default 'Standard',
  rate numeric not null,
  unit_label text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rate_items_trade_idx on rate_items (trade);
create index if not exists rate_items_category_idx on rate_items (category);

alter table rate_items enable row level security;

create policy "Users manage their own rate items"
  on rate_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- client_rate_overrides (migration 045) is kept as-is at the schema level -- override_type is plain text, so
-- narrowing it from Fixed Rate/Discount %/Markup % to just Discount %/Markup % is an app-level change only.
