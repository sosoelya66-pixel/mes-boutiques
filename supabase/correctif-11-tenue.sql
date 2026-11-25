-- Carte d'identité : tenue de base portée avec chaque article (photos cohérentes)
-- À coller dans Supabase → SQL Editor → New query → Run
alter table public.shops add column if not exists tenue text;
