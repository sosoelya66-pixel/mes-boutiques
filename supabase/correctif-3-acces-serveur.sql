-- Correctif : autorise le connecteur Cowork (clé secrète) à utiliser les tables.
-- À coller dans Supabase → SQL Editor → New query → Run
grant usage on schema public to service_role;
grant select, insert, update, delete on public.shops, public.listings, public.sales to service_role;
