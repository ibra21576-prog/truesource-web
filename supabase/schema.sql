-- Run this in Supabase SQL Editor

create extension if not exists "uuid-ossp";

-- Searches per user
create table if not exists searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  query      text not null,
  platform   text not null default 'vinted',
  domain     text not null,
  min_price  numeric,
  max_price  numeric,
  enabled    boolean not null default true,
  created_at timestamptz not null default now()
);
alter table searches enable row level security;
create policy "users own searches" on searches
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Found items (feed + archive)
create table if not exists items (
  id         uuid primary key default gen_random_uuid(),
  search_id  uuid references searches on delete cascade not null,
  user_id    uuid references auth.users not null,
  item_id    text not null,
  platform   text not null,
  domain     text not null,
  title      text,
  price      text,
  url        text,
  image      text,
  found_at   timestamptz not null default now(),
  first_scan boolean not null default false,
  constraint items_search_item unique (search_id, item_id)
);
alter table items enable row level security;
create policy "users own items" on items
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on items (user_id, found_at desc);
create index on items (search_id);

-- Seen IDs per search for deduplication
create table if not exists seen_ids (
  search_id  uuid references searches on delete cascade not null,
  item_id    text not null,
  primary key (search_id, item_id)
);
alter table seen_ids enable row level security;
create policy "users own seen_ids" on seen_ids
  using (exists (
    select 1 from searches s
    where s.id = seen_ids.search_id and s.user_id = auth.uid()
  ));

-- Vinted session cookies per user
create table if not exists vinted_sessions (
  user_id    uuid primary key references auth.users,
  domain     text not null default 'www.vinted.de',
  cookies    text not null,
  updated_at timestamptz not null default now()
);
alter table vinted_sessions enable row level security;
create policy "users own sessions" on vinted_sessions
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
