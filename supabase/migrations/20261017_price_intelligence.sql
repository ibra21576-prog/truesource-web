-- Durable marketplace history + semantic product matching.
-- Safe to run more than once in the Supabase SQL editor.

create extension if not exists vector with schema extensions;

create table if not exists public.market_history (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  domain text not null default '',
  item_id text not null,
  title text not null,
  price_text text,
  price_amount numeric,
  currency text,
  url text,
  image text,
  posted_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  content_hash text not null,
  embedding_model text,
  embedding extensions.vector(384),
  embedded_at timestamptz,
  constraint market_history_listing unique (platform, domain, item_id)
);

create index if not exists market_history_last_seen
  on public.market_history (last_seen_at desc);
create index if not exists market_history_price_lookup
  on public.market_history (currency, price_amount)
  where price_amount is not null;
create index if not exists market_history_embedding_hnsw
  on public.market_history
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

alter table public.market_history enable row level security;

-- Only server-side code using SUPABASE_SERVICE_ROLE_KEY can read raw history.
revoke all on table public.market_history from anon, authenticated;

create or replace function public.match_market_history (
  query_embedding extensions.vector(384),
  match_threshold float default 0.70,
  match_count integer default 50
)
returns table (
  id uuid,
  platform text,
  title text,
  price_amount numeric,
  currency text,
  url text,
  last_seen_at timestamptz,
  similarity float
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    history.id,
    history.platform,
    history.title,
    history.price_amount,
    history.currency,
    history.url,
    history.last_seen_at,
    1 - (history.embedding <=> query_embedding) as similarity
  from public.market_history as history
  where history.embedding is not null
    and 1 - (history.embedding <=> query_embedding) >= match_threshold
  order by history.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 200);
$$;

revoke all on function public.match_market_history(extensions.vector, float, integer) from public, anon, authenticated;
grant execute on function public.match_market_history(extensions.vector, float, integer) to service_role;

-- Make newly created tables/functions immediately visible to PostgREST.
notify pgrst, 'reload schema';

