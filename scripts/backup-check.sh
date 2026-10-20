#!/usr/bin/env bash
# Restore check for FretPath database backups (NFR-06).
#
# Usage: scripts/backup-check.sh restore <dir>
#   <dir> must contain roles.sql, schema.sql and data.sql (from `supabase db dump`).
#
# Environment:
#   RESTORE_ADMIN_URL  superuser connection URL of a THROWAWAY Postgres server
#                      (default: postgresql://postgres:postgres@localhost:5432/postgres)
#   PSQL               psql command to use (default: psql). Must read SQL from stdin.
#
# Plain Postgres lacks some Supabase-managed roles/extensions/schemas, so errors
# during restore are tolerated (counted, sanitized, printed). The check FAILS only if
# public.lessons cannot be queried or has fewer than 1 row after restore.
# Gates (all must hold, otherwise exit 1): schema errors = 0, data errors = 0,
# lessons >= 1, auth.users >= 1, count(public.profiles) = count(auth.users).
# Escape hatch for benign, reviewed production errors (set as env in backup.yml, documented in
# docs/deploy/backup-restore.md): ALLOW_SCHEMA_ERRORS=<n>, ALLOW_DATA_ERRORS=<n> (max tolerated
# count, default 0), ALLOW_PROFILE_MISMATCH=1.
# Output is counts only: never row content (this log is public).
# Never run this against a database you care about: it drops and recreates
# database "restore_check" and loads roles into the cluster.
set -euo pipefail

mode="${1:-}"
dir="${2:-}"
if [ "$mode" != "restore" ] || [ -z "$dir" ]; then
  echo "usage: $0 restore <dir-with-roles.sql-schema.sql-data.sql>" >&2
  exit 2
fi
for f in roles.sql schema.sql data.sql; do
  [ -s "$dir/$f" ] || { echo "::error::missing or empty $dir/$f" >&2; exit 1; }
done

admin_url="${RESTORE_ADMIN_URL:-postgresql://postgres:postgres@localhost:5432/postgres}"
psql_bin="${PSQL:-psql}"
db="restore_check"
# Derive the URL of the scratch database by swapping the database name.
target_url="${admin_url%/*}/$db"

run_admin()  { $psql_bin "$admin_url" -X -q -v ON_ERROR_STOP=1 "$@"; }
run_target() { $psql_bin "$target_url" -X -q -v VERBOSITY=terse "$@"; }
schema_errs=0
data_errs=0

# Prints only a count and sanitized ERROR lines: quoted values are masked and
# DETAIL lines are never shown, so no user data can leak into public logs.
restore_file() {
  local label="$1" file="$2" log errs
  log="$(mktemp)"
  run_target -v ON_ERROR_STOP=0 < "$file" > /dev/null 2> "$log" || true
  errs="$(grep -c 'ERROR:' "$log" || true)"
  echo "restore $label: $errs error(s)"
  case "$label" in schema) schema_errs="$errs" ;; data) data_errs="$errs" ;; esac
  grep 'ERROR:' "$log" | sed -e 's/"[^"]*"/"..."/g' -e "s/'[^']*'/'...'/g" | cut -c1-140 | sort | uniq -c | sort -rn | head -n 10 || true
  rm -f "$log"
}

# Defence in depth: the server must not log failed statements (a failed INSERT would log a whole
# user row). The workflow also runs the container with --log-driver none.
run_admin -c "alter system set log_min_messages = 'fatal'"           -c "alter system set log_min_error_statement = 'panic'"           -c "alter system set log_error_verbosity = 'terse'"           -c "alter system set log_statement = 'none'"           -c "select pg_reload_conf()" > /dev/null

echo "Preparing scratch database $db"
run_admin -c "drop database if exists $db with (force)" -c "create database $db"

# Supabase's reserved roles are NOT in a --role-only dump; create the ones the schema
# references (GRANT / OWNER TO / policies) so real schema breakage is not buried in noise.
run_admin <<'SQL'
do $$
declare r text;
begin
  foreach r in array array['anon','authenticated','service_role','authenticator','supabase_admin',
    'supabase_auth_admin','supabase_storage_admin','dashboard_user','supabase_realtime_admin']
  loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I', r);
    end if;
  end loop;
end $$;
SQL
# Schemas/extensions the dump expects (created inside the scratch database).
if ! run_target -v ON_ERROR_STOP=1 > /dev/null 2>&1 <<'SQL'; then
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
SQL
  echo "::warning::could not create schema/extensions (pgcrypto, uuid-ossp) in the scratch database" >&2
  echo "::error::FAIL: restore environment is incomplete (extensions); check the postgres image" >&2
  exit 1
fi

# Roles are cluster-wide; "already exists" errors are expected and ignored.
$psql_bin "$admin_url" -X -q -v ON_ERROR_STOP=0 < "$dir/roles.sql" > /dev/null 2>&1 || true
echo "restore roles: done (errors ignored)"

restore_file schema "$dir/schema.sql"
restore_file data "$dir/data.sql"

num() { run_target -t -A -c "$1" 2>/dev/null | tr -d '[:space:]' || true; }
isnum() { case "$1" in ''|*[!0-9]*) return 1 ;; *) return 0 ;; esac; }

fail=0
lessons="$(num 'select count(*) from public.lessons')"
isnum "$lessons" || { echo "::error::FAIL: public.lessons cannot be queried after restore" >&2; exit 1; }
users="$(num 'select count(*) from auth.users')"
profiles="$(num 'select count(*) from public.profiles')"
echo "public.lessons count after restore: $lessons"
echo "auth.users count after restore: ${users:-unavailable}"
echo "public.profiles count after restore: ${profiles:-unavailable}"
echo "errors: schema=$schema_errs data=$data_errs"

gate() { echo "::error::FAIL: $1" >&2; fail=1; }
[ "$lessons" -ge 1 ] || gate "public.lessons is empty"
[ "$schema_errs" -le "${ALLOW_SCHEMA_ERRORS:-0}" ] || gate "schema restore had $schema_errs error(s) (allowed ${ALLOW_SCHEMA_ERRORS:-0})"
[ "$data_errs" -le "${ALLOW_DATA_ERRORS:-0}" ] || gate "data restore had $data_errs error(s) (allowed ${ALLOW_DATA_ERRORS:-0})"
if ! isnum "$users" || [ "$users" -lt 1 ]; then gate "auth.users is empty or unreadable"; fi
if ! isnum "$profiles" || [ "$profiles" != "$users" ]; then
  [ "${ALLOW_PROFILE_MISMATCH:-0}" = "1" ] || gate "public.profiles ($profiles) does not match auth.users ($users)"
fi
[ "$fail" -eq 0 ] || exit 1
echo "RESTORE CHECK PASSED (lessons=$lessons users=$users profiles=$profiles)"
