#!/usr/bin/env bash
# Called by the protected deploy job on master after resolve-due has been deployed.
set -euo pipefail
umask 077
: "${SUPABASE_PROJECT_REF:?}"
: "${SUPABASE_ACCESS_TOKEN:?}"
[[ "$SUPABASE_PROJECT_REF" =~ ^[a-z0-9]{20}$ ]]
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
remote="--remote=$SUPABASE_PROJECT_REF"
url="https://$SUPABASE_PROJECT_REF.supabase.co"

cat > "$work/bootstrap.sql" <<SQL
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;
do \$bootstrap\$
begin
  if not exists (select from vault.secrets where name = 'gv_project_url') then
    perform vault.create_secret('$url', 'gv_project_url');
  end if;
  if not exists (select from vault.decrypted_secrets where name = 'gv_project_url' and decrypted_secret = '$url') then
    raise exception 'Unexpected scheduler destination';
  end if;
  if not exists (select from vault.secrets where name = 'gv_scheduler_token') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'gv_scheduler_token');
  end if;
end
\$bootstrap\$;
SQL
supabase db query "$remote" --yes --file "$work/bootstrap.sql" >/dev/null

# Only transfer the dedicated scheduler token from Vault to the function on the same project.
# The Management API returns an array of rows. Never log its response or pass the token on argv.
cat > "$work/query.json" <<'JSON'
{"query":"select decrypted_secret as token from vault.decrypted_secrets where name = 'gv_scheduler_token'"}
JSON
printf 'Authorization: Bearer %s\n' "$SUPABASE_ACCESS_TOKEN" > "$work/header"
curl --silent --show-error --fail --max-time 30 \
  --header "@$work/header" --header 'Content-Type: application/json' \
  --data-binary "@$work/query.json" "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/database/query" \
  --output "$work/result.json"
python3 - "$work/result.json" > "$work/edge.env" <<'PYTHON'
import json
import re
import sys
with open(sys.argv[1]) as result:
    rows = json.load(result)
token = rows[0]["token"] if len(rows) == 1 else None
if not isinstance(token, str) or not re.fullmatch(r"[A-Za-z0-9_-]{32,128}", token):
    sys.exit("Invalid scheduler token format in Vault")
print("GV_SCHEDULER_TOKEN=" + token)
PYTHON
supabase secrets set "$remote" --env-file "$work/edge.env" --yes >/dev/null
supabase db query "$remote" --yes --file supabase/scheduler/resolve-due.sql >/dev/null
cat > "$work/verify.sql" <<'SQL'
do $verify$
begin
  if (select count(*) from cron.job where jobname = 'gv-resolve-due' and active and schedule = '* * * * *') <> 1 then
    raise exception 'Expected one active gv-resolve-due job';
  end if;
end
$verify$;
SQL
supabase db query "$remote" --yes --file "$work/verify.sql" >/dev/null
