-- Faux environnement Supabase pour tester les migrations hors ligne avec PGlite (src/game/supabase.check.cjs).
-- Reproduit seulement ce dont dépendent nos migrations : rôles, schéma auth, auth.uid(), publication Realtime.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, is_anonymous boolean not null default true, created_at timestamptz not null default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create publication supabase_realtime;
