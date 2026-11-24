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

create index if not exists sales_date_idx on public.sales (date_vente desc);
create index if not exists sales_shop_idx on public.sales (shop_id);
create index if not exists listings_shop_idx on public.listings (shop_id);

-- Autorise l'appli (utilisateur connecté) à utiliser ces tables.
-- Les règles « proprio » ci-dessous limitent ensuite chaque ligne à son propriétaire.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.shops, public.listings, public.sales to authenticated;

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
