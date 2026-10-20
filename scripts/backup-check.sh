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
run_target() { $psql_bin "$target_url" -X -q "$@"; }

# Prints only a count and sanitized ERROR lines: quoted values are masked and
# DETAIL lines are never shown, so no user data can leak into public logs.
restore_file() {
  local label="$1" file="$2" log errs
  log="$(mktemp)"
  run_target -v ON_ERROR_STOP=0 < "$file" > /dev/null 2> "$log" || true
  errs="$(grep -c 'ERROR:' "$log" || true)"
  echo "restore $label: $errs error(s) tolerated"
  grep 'ERROR:' "$log" | sed -e 's/"[^"]*"/"..."/g' -e "s/'[^']*'/'...'/g" | cut -c1-140 | sort | uniq -c | sort -rn | head -n 10 || true
  rm -f "$log"
}

echo "Preparing scratch database $db"
run_admin -c "drop database if exists $db with (force)" -c "create database $db"

# Roles are cluster-wide; "already exists" errors are expected and ignored.
$psql_bin "$admin_url" -X -q -v ON_ERROR_STOP=0 < "$dir/roles.sql" > /dev/null 2>&1 || true
echo "restore roles: done (errors ignored)"

restore_file schema "$dir/schema.sql"
restore_file data "$dir/data.sql"

count="$(run_target -t -A -c 'select count(*) from public.lessons' 2>/dev/null | tr -d '[:space:]' || true)"
case "$count" in
  ''|*[!0-9]*) echo "::error::FAIL: public.lessons cannot be queried after restore" >&2; exit 1 ;;
esac
echo "public.lessons count after restore: $count"
if [ "$count" -lt 1 ]; then
  echo "::error::FAIL: public.lessons is empty after restore" >&2
  exit 1
fi
echo "RESTORE CHECK PASSED (lessons=$count)"
