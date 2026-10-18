-- Deal workflow, smarter monitors and durable price events.
-- Safe to run more than once in the Supabase SQL editor.

alter table public.searches add column if not exists exclude_terms text[] not null default '{}';
alter table public.searches add column if not exists max_age_hours integer not null default 48;
alter table public.searches add column if not exists alert_max_price numeric;
alter table public.searches add column if not exists alert_min_discount numeric;

create table if not exists public.saved_deals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  item_id uuid not null references public.items(id) on delete cascade,
  status text not null default 'watching'
    check (status in ('watching', 'bought', 'sold', 'ignored')),
  purchase_price numeric,
  shipping_cost numeric not null default 0,
  fees numeric not null default 0,
  sale_price numeric,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_deals_user_item unique (user_id, item_id)
);

create index if not exists saved_deals_user_status
  on public.saved_deals (user_id, status, updated_at desc);

create table if not exists public.item_price_events (
  id bigint generated always as identity primary key,
  user_id text,
  item_id uuid not null references public.items(id) on delete cascade,
  price_text text,
  price_amount numeric,
  currency text,
  recorded_at timestamptz not null default now()
);

create index if not exists item_price_events_item_time
  on public.item_price_events (item_id, recorded_at desc);

create unique index if not exists item_price_events_unique_value
  on public.item_price_events (item_id, price_text, price_amount);

alter table public.saved_deals enable row level security;
alter table public.item_price_events enable row level security;
revoke all on table public.saved_deals from anon, authenticated;
revoke all on table public.item_price_events from anon, authenticated;

notify pgrst, 'reload schema';
