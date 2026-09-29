#!/usr/bin/env bash
set -euo pipefail

# An isolated, disposable PostgreSQL 15 check. No host port or persistent volume.
cd "$(dirname "$0")/.."
command -v docker >/dev/null || { echo 'Docker is required' >&2; exit 2; }

image=${OPENOI_TEST_POSTGRES_IMAGE:-public.ecr.aws/docker/library/postgres:15}
container_name="openoi-db-test-$$"
test_dir=$(mktemp -d)
cleanup() {
  docker stop "$container_name" >/dev/null 2>&1 || true
  rm -rf "$test_dir"
}
trap cleanup EXIT

if ! docker image inspect "$image" >/dev/null 2>&1; then
  docker pull "$image"
fi
docker run --pull=never --rm --name "$container_name" \
  -e POSTGRES_PASSWORD=test -d "$image" >/dev/null

ready=false
for _ in $(seq 1 50); do
  # The image briefly starts a temporary server during initialization.
  # Wait until entrypoint has exec'd the final postgres process.
  if docker exec "$container_name" sh -c 'test "$(cat /proc/1/comm)" = postgres && pg_isready -U postgres' >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 0.2
done
if [[ "$ready" != true ]]; then
  echo 'Test PostgreSQL did not become ready' >&2
  docker logs "$container_name" >&2 || true
  exit 1
fi

docker exec -i "$container_name" psql -X -q -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < tests/database/plain_postgres_bootstrap.sql
docker exec -i "$container_name" psql -X -q -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < supabase/migrations/20260929000000_initial.sql

printf '#!/usr/bin/env bash\nexec docker exec -i %q psql "$@"\n' "$container_name" > "$test_dir/psql"
chmod +x "$test_dir/psql"
PATH="$test_dir:$PATH" \
OPENOI_TEST_DB_URL='postgresql://postgres:test@localhost:5432/postgres' \
OPENOI_TEST_DB_CONFIRM=disposable \
bash scripts/test-db.sh
