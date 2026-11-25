-- Tâches du jour (créées chaque matin, à cocher)
-- À coller dans Supabase → SQL Editor → New query → Run
create table if not exists public.taches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  jour date not null,
  cle text not null,                 -- identifiant stable (ex. colis:<id>) pour ne pas créer de doublon
  type text not null default 'perso',
  titre text not null,
  detail text,
  lien text,
  ordre int not null default 100,
  fait boolean not null default false,
  auto boolean not null default false, -- cochée automatiquement par l'appli
  fait_le timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, jour, cle)
);
create index if not exists taches_jour_idx on public.taches (owner_id, jour);
alter table public.taches enable row level security;
drop policy if exists "proprio" on public.taches;
create policy "proprio" on public.taches for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select, insert, update, delete on public.taches to authenticated;
grant select, insert, update, delete on public.taches to service_role;
