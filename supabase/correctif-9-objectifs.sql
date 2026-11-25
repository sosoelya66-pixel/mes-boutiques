-- Objectifs mensuels : un global + un par boutique
-- À coller dans Supabase → SQL Editor → New query → Run
alter table public.shops add column if not exists objectif_mensuel numeric(10,2);

create table if not exists public.reglages (
  owner_id uuid primary key default auth.uid() references auth.users on delete cascade,
  objectif_mensuel numeric(10,2),
  updated_at timestamptz not null default now()
);
alter table public.reglages enable row level security;
drop policy if exists "proprio" on public.reglages;
create policy "proprio" on public.reglages for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select, insert, update on public.reglages to authenticated;
grant select, insert, update, delete on public.reglages to service_role;
