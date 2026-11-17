-- À exécuter sur le projet cible après le déploiement de resolve-due.
-- Le propriétaire provisionne dans Vault gv_project_url et gv_scheduler_token.
-- Seul resolve-due accepte ce jeton, configuré dans GV_SCHEDULER_TOKEN côté Edge.
do $$
begin
  if not exists(select from vault.decrypted_secrets where name='gv_project_url' and decrypted_secret ~ '^https://[^/]+/?$')
    or not exists(select from vault.decrypted_secrets where name='gv_scheduler_token' and length(decrypted_secret) >= 32) then
    raise exception 'Configurer gv_project_url et gv_scheduler_token dans Vault';
  end if;
end $$;

select cron.schedule('gv-resolve-due', '* * * * *', $job$
  select net.http_post(
    url := rtrim((select decrypted_secret from vault.decrypted_secrets where name='gv_project_url'), '/') || '/functions/v1/resolve-due',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets where name='gv_scheduler_token')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
$job$);
