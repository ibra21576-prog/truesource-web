-- Strict per-member ownership for TrueSource data.
-- Safe to run more than once.

alter table public.searches add column if not exists user_id text;
alter table public.items add column if not exists user_id text;

create index if not exists searches_user_id_created
  on public.searches (user_id, created_at desc);
create index if not exists items_user_id_found
  on public.items (user_id, found_at desc);

-- Browser clients must never read the shared tables directly. All access goes
-- through authenticated server routes that enforce the custom Whop session.
drop policy if exists "allow all searches" on public.searches;
drop policy if exists "allow all items" on public.items;
drop policy if exists "allow all seen_ids" on public.seen_ids;
revoke all on table public.searches from anon, authenticated;
revoke all on table public.items from anon, authenticated;
revoke all on table public.seen_ids from anon, authenticated;

notify pgrst, 'reload schema';
