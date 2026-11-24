-- Étape 3 : synchro des e-mails Vinted (journal, état de la synchro, prix provisoire)
-- À coller dans Supabase → SQL Editor → New query → Run

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
