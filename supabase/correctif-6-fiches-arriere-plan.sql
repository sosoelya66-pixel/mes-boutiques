-- Fiches créées en arrière-plan : suivi de la préparation (texte + photos)
-- À coller dans Supabase → SQL Editor → New query → Run
alter table public.listings add column if not exists generation jsonb;
