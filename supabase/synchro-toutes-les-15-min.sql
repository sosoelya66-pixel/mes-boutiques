-- Lance la synchro des e-mails toutes les 15 minutes (tâche planifiée Supabase).
-- 1) Remplace COLLE_ICI_TON_MCP_TOKEN par la valeur de MCP_TOKEN (celle de Vercel).
-- 2) Colle dans Supabase → SQL Editor → New query → Run.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('synchro-emails') where exists (select 1 from cron.job where jobname = 'synchro-emails');

select cron.schedule(
  'synchro-emails',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://mes-boutiques-ten.vercel.app/api/sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer COLLE_ICI_TON_MCP_TOKEN"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 290000
  );
  $$
);
