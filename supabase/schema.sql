-- ============================================================
-- Mes boutiques : tables, sécurité et stockage
-- À coller UNE FOIS dans Supabase → SQL Editor → New query → Run
-- ============================================================

-- Boutiques (comptes Vinted)
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  nom text not null,
  taille text,
  alias_email text,
  couleur text not null default '#8b7cf6',
  actif boolean not null default true,
  derniere_synchro timestamptz,
  created_at timestamptz not null default now()
);

-- Fiches produits (remplies par Cowork à l'étape 4, ou à la main)
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  shop_id uuid references public.shops on delete set null,
  photos text[] not null default '{}',
  titre text not null default '',
  description text not null default '',
  marque text,
  categorie text,
  couleur text,
  matiere text,
  etat text,
  prix numeric(10,2) not null default 0,
  prix_achat numeric(10,2) not null default 0,
  liens_produit text[] not null default '{}',  -- liens fournisseur (AliExpress, 1688…)
  vinted_url text,
  notes text,
  statut text not null default 'brouillon' check (statut in ('brouillon','en_ligne','vendu')),
  created_at timestamptz not null default now()
);

-- Ventes
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  shop_id uuid not null references public.shops on delete restrict,
  listing_id uuid references public.listings on delete set null,
  gmail_message_id text unique,              -- anti-doublon de la synchro Gmail
  titre text not null default '',
  photo_url text,
  prix numeric(10,2) not null default 0,
  prix_achat numeric(10,2) not null default 0,
  frais numeric(10,2) not null default 0,
  acheteur text,
  date_vente timestamptz not null default now(),
  statut text not null default 'a_envoyer' check (statut in ('a_envoyer','envoye','termine')),
  bordereau_url text,                         -- lien externe ou fichier du stockage
  suivi text,
  notes text,
  created_at timestamptz not null default now()
);

-- Style photo de chaque boutique (utilisé par Cowork / ChatGPT pour les photos portées)
alter table public.shops add column if not exists avatar_url text;          -- photo de référence de l'avatar
alter table public.shops add column if not exists style_avatar text;       -- description de l'avatar
alter table public.shops add column if not exists style_fond text;         -- décor / fond
alter table public.shops add column if not exists style_sol text;          -- sol

create index if not exists sales_date_idx on public.sales (date_vente desc);
create index if not exists sales_shop_idx on public.sales (shop_id);
create index if not exists listings_shop_idx on public.listings (shop_id);

-- Autorise l'appli (utilisateur connecté) à utiliser ces tables.
-- Les règles « proprio » ci-dessous limitent ensuite chaque ligne à son propriétaire.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.shops, public.listings, public.sales to authenticated;
-- Accès serveur (connecteur Cowork, synchro Gmail) avec la clé secrète
grant usage on schema public to service_role;
grant select, insert, update, delete on public.shops, public.listings, public.sales to service_role;

-- Sécurité : chaque ligne n'est visible que par son propriétaire
alter table public.shops enable row level security;
alter table public.listings enable row level security;
alter table public.sales enable row level security;

drop policy if exists "proprio" on public.shops;
drop policy if exists "proprio" on public.listings;
drop policy if exists "proprio" on public.sales;
create policy "proprio" on public.shops for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "proprio" on public.listings for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "proprio" on public.sales for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Stockage : photos (lien public) et bordereaux (privés)
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('bordereaux', 'bordereaux', false)
  on conflict (id) do nothing;

-- Les fichiers sont rangés dans un dossier au nom de l'utilisateur
drop policy if exists "fichiers proprio" on storage.objects;
create policy "fichiers proprio" on storage.objects for all to authenticated
  using (bucket_id in ('photos','bordereaux') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('photos','bordereaux') and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Étape 3 : synchro des e-mails (identique à correctif-4-synchro.sql)
-- ============================================================

-- Ventes : origine du prix (manuel | email | fiche | aucun) et référence de commande Vinted
alter table public.sales add column if not exists prix_source text not null default 'manuel';
alter table public.sales add column if not exists ref_vinted text;
create index if not exists sales_ref_idx on public.sales (ref_vinted);

-- Journal : chaque e-mail Vinted lu et ce qui en a été fait
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  message_id text not null unique,
  recu_le timestamptz,
  expediteur text,
  destinataire text,
  sujet text,
  type text,
  statut text not null,            -- traite | ignore | a_verifier | erreur
  detail text,
  donnees jsonb,
  shop_id uuid references public.shops on delete set null,
  sale_id uuid references public.sales on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists email_log_recu_idx on public.email_log (recu_le desc);

-- État de la synchro (dernier e-mail lu, dernière erreur)
create table if not exists public.sync_state (
  owner_id uuid primary key references auth.users on delete cascade,
  uidvalidity bigint,
  last_uid bigint not null default 0,
  derniere_synchro timestamptz,
  derniere_erreur text,
  en_cours_depuis timestamptz
);

alter table public.email_log enable row level security;
alter table public.sync_state enable row level security;
drop policy if exists "proprio" on public.email_log;
drop policy if exists "proprio" on public.sync_state;
create policy "proprio" on public.email_log for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "proprio" on public.sync_state for select to authenticated using (owner_id = auth.uid());

grant select, update, delete on public.email_log to authenticated;
grant select on public.sync_state to authenticated;
grant select, insert, update, delete on public.email_log, public.sync_state to service_role;

-- ============================================================
-- Notifications (identique à correctif-5-notifications.sql)
-- ============================================================
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

-- Fiches en arrière-plan (identique à correctif-6)
alter table public.listings add column if not exists generation jsonb;

-- Carte d'identité (identique à correctif-7)
alter table public.shops add column if not exists prompt_photo text;

-- Photos fond et sol (identique à correctif-8)
alter table public.shops add column if not exists fond_url text;
alter table public.shops add column if not exists sol_url text;

-- Objectifs (identique à correctif-9)
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
