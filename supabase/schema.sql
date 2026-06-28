-- Run this in Supabase SQL Editor (no auth required version)

create extension if not exists "uuid-ossp";

-- Searches
create table if not exists searches (
  id         uuid primary key default gen_random_uuid(),
  query      text not null,
  platform   text not null default 'vinted',
  domain     text not null,
  min_price  numeric,
  max_price  numeric,
  enabled    boolean not null default true,
  created_at timestamptz not null default now(),
  last_scraped_at timestamptz   -- used by the cron scheduler for fair rotation at scale
);

-- If upgrading an existing DB, run this once:
-- alter table searches add column if not exists last_scraped_at timestamptz;
create index if not exists searches_last_scraped on searches (last_scraped_at nulls first);

-- Found items (feed + archive)
create table if not exists items (
  id         uuid primary key default gen_random_uuid(),
  search_id  uuid references searches on delete cascade not null,
  item_id    text not null,
  platform   text not null,
  domain     text not null,
  title      text,
  price      text,
  url        text,
  image      text,
  found_at   timestamptz not null default now(),
  posted_at  timestamptz,   -- real marketplace post time (when the platform exposes it)
  first_scan boolean not null default false,
  constraint items_search_item unique (search_id, item_id)
);
-- If upgrading an existing DB, run this once:
-- alter table items add column if not exists posted_at timestamptz;
create index if not exists items_found_at on items (found_at desc);
create index if not exists items_search_id on items (search_id);

-- Seen IDs for deduplication
create table if not exists seen_ids (
  search_id  uuid references searches on delete cascade not null,
  item_id    text not null,
  primary key (search_id, item_id)
);

-- Allow all operations (no auth)
alter table searches enable row level security;
alter table items enable row level security;
alter table seen_ids enable row level security;

drop policy if exists "allow all searches" on searches;
drop policy if exists "allow all items" on items;
drop policy if exists "allow all seen_ids" on seen_ids;

create policy "allow all searches" on searches for all using (true) with check (true);
create policy "allow all items"    on items    for all using (true) with check (true);
create policy "allow all seen_ids" on seen_ids for all using (true) with check (true);
