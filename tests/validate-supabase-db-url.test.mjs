import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const valid = 'postgresql://postgres.rnwojkpmsmypeaetxknr:dummy@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require';
const script = fileURLToPath(new URL('../scripts/validate-supabase-db-url.mjs', import.meta.url));

function check(uri, accepted) {
  const result = spawnSync(process.execPath, [script], {
    env: { ...process.env, SUPABASE_DB_URL: uri },
    encoding: 'utf8',
  });
  assert.equal(result.status === 0, accepted);
  assert.doesNotMatch(result.stdout + result.stderr, /dummy/);
}

test('accepts the OpenOI session-pooler URI with required TLS', () => check(valid, true));

test('rejects a malformed, foreign, or non-TLS target without echoing credentials', () => {
  for (const uri of [
    'not-a-url',
    valid.replace('postgres.rnwojkpmsmypeaetxknr', 'postgres.other-project'),
    valid.replace('pooler.supabase.com', 'example.com'),
    valid.replace(':5432/', ':6543/'),
    valid.replace('sslmode=require', 'sslmode=disable'),
    valid.replace('sslmode=require', 'sslmode=require&sslmode=disable'),
    valid + '&host=evil.example.com',
    valid + '&user=postgres.other-project',
    valid + ' ',
    valid.replace('?sslmode=require', ''),
    valid.replace('/postgres?', '/other?'),
  ]) check(uri, false);
});
