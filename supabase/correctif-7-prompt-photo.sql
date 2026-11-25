-- Carte d'identité des boutiques : prompt photo ChatGPT enregistré
-- À coller dans Supabase → SQL Editor → New query → Run
alter table public.shops add column if not exists prompt_photo text;
