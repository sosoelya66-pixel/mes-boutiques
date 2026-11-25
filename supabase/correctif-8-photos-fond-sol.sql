-- Carte d'identité : photos de référence du fond (décor) et du sol
-- À coller dans Supabase → SQL Editor → New query → Run
alter table public.shops add column if not exists fond_url text;
alter table public.shops add column if not exists sol_url text;
