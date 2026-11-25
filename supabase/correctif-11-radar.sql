-- Radar produits : recherches Temu / Shein et résultats
-- À coller dans Supabase → SQL Editor → New query → Run
create table if not exists public.radar (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  params jsonb not null default '{}',
  statut text not null default 'en_cours' check (statut in ('en_cours','termine','erreur')),
  resultats jsonb,
  erreur text,
  created_at timestamptz not null default now()
);
create index if not exists radar_date_idx on public.radar (owner_id, created_at desc);
alter table public.radar enable row level security;
drop policy if exists "proprio" on public.radar;
create policy "proprio" on public.radar for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select, delete on public.radar to authenticated;
grant select, insert, update, delete on public.radar to service_role;
