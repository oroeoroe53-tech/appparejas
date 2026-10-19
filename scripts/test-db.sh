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
for f in "$ROOT"/supabase/tests/[1-9]*_*.test.sql; do
  echo "== $(basename "$f")"
  if ! out=$(run_file "$f" 2>&1); then echo "$out"; echo "DB tests FAILED"; exit 1; fi
  echo "$out" | grep -E "NOTICE:  ok - " | sed -E 's/^.*NOTICE:  /  /'
done
echo "DB tests passed"
