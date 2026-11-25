-- Prépare les tâches du jour et envoie la notification chaque matin à 8 h (heure de Paris).
-- Remplace COLLE_ICI_TON_MCP_TOKEN par la valeur de MCP_TOKEN, puis Run.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('taches-du-matin', '0 6,7 * * *', $$
  select net.http_post(
    url := 'https://mes-boutiques-ten.vercel.app/api/taches/matin',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer COLLE_ICI_TON_MCP_TOKEN"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$$);
