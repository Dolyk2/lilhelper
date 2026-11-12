-- Garmin sync schedule: runs the "garmin-sync" function every 30 minutes.
-- The schedule proves itself with a random password kept in the encrypted vault; only the
-- server (service role) can read it back, through garmin_sync_secret().
create extension if not exists pg_cron;
create extension if not exists pg_net;
select vault.create_secret(gen_random_uuid()::text || gen_random_uuid()::text, 'garmin_sync_secret')
where not exists (select 1 from vault.secrets where name = 'garmin_sync_secret');

create or replace function public.garmin_sync_secret() returns text
language sql security definer set search_path = '' stable as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'garmin_sync_secret' limit 1
$$;
revoke all on function public.garmin_sync_secret() from public, anon, authenticated;
grant execute on function public.garmin_sync_secret() to service_role;

select cron.unschedule('garmin-sync') where exists (select 1 from cron.job where jobname = 'garmin-sync');
select cron.schedule('garmin-sync', '*/30 * * * *', $$
  select net.http_post(
    url := 'https://lihhnqodljalqaeifxxj.supabase.co/functions/v1/garmin-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-sync-secret', public.garmin_sync_secret()),
    body := '{}'::jsonb, timeout_milliseconds := 30000);
$$);
