// Vérifie dans PostgreSQL la configuration et le corps de la commande périodique, avec de faux adaptateurs.
import { readFile } from 'node:fs/promises'

export async function run(db, { assert }) {
  const install = await readFile(new URL('../scheduler/resolve-due.sql', import.meta.url), 'utf8')
  await db.exec(`
    create schema vault;
    create table vault.decrypted_secrets(name text, decrypted_secret text);
    create schema cron;
    create table cron.jobs(name text primary key, schedule text, command text);
    create function cron.schedule(text,text,text) returns void language sql as $$
      insert into cron.jobs values ($1,$2,$3) on conflict(name) do update set command=excluded.command
    $$;
    create schema net;
    create table net.requests(url text, headers jsonb, body jsonb, timeout_milliseconds integer);
    create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds integer)
    returns void language sql as $$ insert into net.requests values ($1,$2,$3,$4) $$;
  `)
  await assert.rejects(db.exec(install), /Configurer/)
  await db.exec("insert into vault.decrypted_secrets values ('gv_project_url','https://local.invalid/'),('gv_scheduler_token', repeat('x',32))")
  await db.exec(install)
  await db.exec(install)
  const { rows: jobs } = await db.query('select * from cron.jobs')
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].schedule, '* * * * *')
  await db.exec(jobs[0].command)
  const { rows: [request] } = await db.query('select * from net.requests')
  assert.equal(request.url, 'https://local.invalid/functions/v1/resolve-due')
  assert.equal(request.headers.Authorization, 'Bearer ' + 'x'.repeat(32))
  assert.deepEqual(request.body, {})
}
