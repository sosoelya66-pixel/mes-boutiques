-- Soso Studio : tables de la base de données
-- À coller dans Supabase → SQL Editor → New query → Run (une seule fois)

-- Réglages (une ligne pour ton compte)
create table if not exists public.reglages (
  owner_id uuid primary key default auth.uid() references auth.users on delete cascade,
  prenom text not null default '',
  ville text not null default 'Lille',
  limite_google_jour int not null default 20,       -- recherches Google maximum par jour
  updated_at timestamptz not null default now()
);

-- Commerces (repérés sur la carte ou ajoutés à la main) et suivi client
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  place_id text,                       -- identifiant Google du commerce
  nom text not null,
  categorie text,                      -- coiffeur, barbier, restaurant…
  quartier text,
  adresse text,
  lat double precision,
  lng double precision,
  telephone text,
  email text,
  contact_nom text,
  site text,
  site_etat text not null default 'aucun',  -- aucun | reseau (réseau social, annuaire) | site
  note_google numeric,
  nb_avis int,
  maps_url text,
  google_maj timestamptz,
  source text not null default 'google',    -- google | manuel
  statut text not null default 'nouveau',   -- nouveau, a_contacter, contacte, rdv, devis, signe, livre, perdu
  relance_le date,
  rdv_le timestamptz,
  montant numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, place_id)
);
create index if not exists prospects_statut_idx on public.prospects (owner_id, statut);

-- Historique d'un commerce (notes, appels, changements d'étape)
create table if not exists public.activites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  prospect_id uuid not null references public.prospects on delete cascade,
  type text not null default 'note',   -- note | statut | appel | email | visite | relance | rdv
  texte text not null,
  created_at timestamptz not null default now()
);
create index if not exists activites_prospect_idx on public.activites (prospect_id, created_at desc);
create index if not exists activites_jour_idx on public.activites (owner_id, created_at desc);

-- Tâches perso (les relances et rendez-vous sont calculés automatiquement)
create table if not exists public.taches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  titre text not null,
  jour date not null default current_date,
  fait boolean not null default false,
  fait_le timestamptz,
  created_at timestamptz not null default now()
);

-- Consommation des services payants (Google, plus tard Claude)
create table if not exists public.conso (
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  jour date not null,
  service text not null,               -- google_places | claude…
  requetes int not null default 0,
  cout numeric not null default 0,     -- coût estimé en euros
  primary key (owner_id, jour, service)
);

-- Chaque table n'est visible que par son propriétaire
do $$
declare t text;
begin
  foreach t in array array['reglages','prospects','activites','taches','conso'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "proprio" on public.%I', t);
    execute format('create policy "proprio" on public.%I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
  end loop;
end $$;
