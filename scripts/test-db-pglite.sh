#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v npm >/dev/null || { echo 'npm is required for isolated PGlite test' >&2; exit 2; }
command -v node >/dev/null || { echo 'node is required for isolated PGlite test' >&2; exit 2; }

test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT
npm install --silent --prefix "$test_dir" --cache "$test_dir/npm-cache" @electric-sql/pglite@0.3.14
node scripts/test-db-pglite.mjs "$test_dir/node_modules/@electric-sql/pglite/dist/index.js"
