-- Notifications sur le téléphone : appareils inscrits + date du dernier rappel
-- À coller dans Supabase → SQL Editor → New query → Run
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  appareil text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "proprio" on public.push_subscriptions;
create policy "proprio" on public.push_subscriptions for select to authenticated using (owner_id = auth.uid());
grant select on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;

alter table public.sync_state add column if not exists derniere_relance date;
