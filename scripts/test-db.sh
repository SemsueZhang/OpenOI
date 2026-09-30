#!/usr/bin/env bash
set -euo pipefail

# Use only a disposable local Supabase database or a dedicated test project.
: "${OPENOI_TEST_DB_URL:?Set OPENOI_TEST_DB_URL to a disposable Supabase postgres connection URL}"
: "${OPENOI_TEST_DB_CONFIRM:?Set OPENOI_TEST_DB_CONFIRM=disposable after checking the target database}"
if [[ "$OPENOI_TEST_DB_CONFIRM" != disposable ]]; then
  echo 'OPENOI_TEST_DB_CONFIRM must be disposable' >&2
  exit 2
fi
command -v psql >/dev/null || { echo 'psql is required for database acceptance tests' >&2; exit 2; }

psql -X -q -v ON_ERROR_STOP=1 "$OPENOI_TEST_DB_URL" < tests/database/acceptance.sql >/dev/null
psql -X -q -v ON_ERROR_STOP=1 "$OPENOI_TEST_DB_URL" < tests/database/content_limits.sql >/dev/null
psql -X -q -v ON_ERROR_STOP=1 "$OPENOI_TEST_DB_URL" < tests/database/noi_import.sql >/dev/null
echo 'Database acceptance, content-limit, and NOI import tests passed'
