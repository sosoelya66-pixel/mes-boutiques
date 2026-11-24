-- Correctif : donne à l'appli le droit d'utiliser les tables.
-- À coller dans Supabase → SQL Editor → New query → Run
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.shops, public.listings, public.sales to authenticated;
