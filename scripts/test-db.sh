#!/usr/bin/env bash
# Runs the migrations + SQL permission tests against a throwaway local Postgres cluster.
# Requires PostgreSQL server binaries (e.g. /usr/lib/postgresql/16/bin). No Supabase needed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
DATA="$(mktemp -d /tmp/us-pgtest.XXXXXX)"
PORT="${PGTEST_PORT:-54991}"
RUN=""
if [ "$(id -u)" = "0" ]; then
  chown postgres "$DATA"
  RUN="runuser -u postgres --"
fi

cleanup() { $RUN "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

$RUN "$PGBIN/initdb" -D "$DATA" -A trust -U postgres >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp -c listen_addresses=''" -l "$DATA/log" -w start >/dev/null

PSQL="psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q -X -t -A"
$PSQL -d postgres -c "create database app_test" >/dev/null
run_file() { $PSQL -d app_test -f "$1"; }

run_file "$ROOT/supabase/tests/00_stubs.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do run_file "$f"; done
run_file "$ROOT/supabase/tests/01_helpers.sql"
for f in "$ROOT"/supabase/tests/[1-9a]*_*.test.sql; do
  echo "== $(basename "$f")"
  if ! out=$(run_file "$f" 2>&1); then echo "$out"; echo "DB tests FAILED"; exit 1; fi
  echo "$out" | grep -E "NOTICE:  ok - " | sed -E 's/^.*NOTICE:  /  /'
done
# The pasteable bundle must produce a working schema when applied after migrations 01 and 02.
$PSQL -d postgres -c "create database app_bundle" >/dev/null
$PSQL -d app_bundle -f "$ROOT/supabase/tests/00_stubs.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/20260101*.sql "$ROOT"/supabase/migrations/20260102*.sql; do $PSQL -d app_bundle -f "$f" >/dev/null; done
$PSQL -d app_bundle -f "$ROOT/supabase/bundles/after-02.sql" >/dev/null
echo "  ok - the SQL bundle applies cleanly after migrations 01 and 02"
# The smaller bundle must work on top of migrations 01-07.
$PSQL -d postgres -c "create database app_bundle2" >/dev/null
$PSQL -d app_bundle2 -f "$ROOT/supabase/tests/00_stubs.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/2026010[1-7]*.sql; do $PSQL -d app_bundle2 -f "$f" >/dev/null; done
$PSQL -d app_bundle2 -f "$ROOT/supabase/bundles/after-07.sql" >/dev/null
echo "  ok - the after-07 bundle applies cleanly after migrations 01-07"
# The smallest bundle must work on top of migrations 01-08.
$PSQL -d postgres -c "create database app_bundle3" >/dev/null
$PSQL -d app_bundle3 -f "$ROOT/supabase/tests/00_stubs.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/2026010[1-8]*.sql; do $PSQL -d app_bundle3 -f "$f" >/dev/null; done
$PSQL -d app_bundle3 -f "$ROOT/supabase/bundles/after-08.sql" >/dev/null
echo "  ok - the after-08 bundle applies cleanly after migrations 01-08"
# And the newest one on top of 01-09.
$PSQL -d postgres -c "create database app_bundle4" >/dev/null
$PSQL -d app_bundle4 -f "$ROOT/supabase/tests/00_stubs.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/2026010[1-9]*.sql; do $PSQL -d app_bundle4 -f "$f" >/dev/null; done
$PSQL -d app_bundle4 -f "$ROOT/supabase/bundles/after-09.sql" >/dev/null
echo "  ok - the after-09 bundle applies cleanly after migrations 01-09"
echo "DB tests passed"
