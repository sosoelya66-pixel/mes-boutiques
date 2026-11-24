-- Ajoute le style photo de chaque boutique (avatar, fond, sol).
-- À coller dans Supabase → SQL Editor → New query → Run
alter table public.shops add column if not exists avatar_url text;
alter table public.shops add column if not exists style_avatar text;
alter table public.shops add column if not exists style_fond text;
alter table public.shops add column if not exists style_sol text;
