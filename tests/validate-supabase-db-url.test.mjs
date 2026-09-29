import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const valid = 'postgresql://postgres.rnwojkpmsmypeaetxknr:dummy@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require';
const script = fileURLToPath(new URL('../scripts/validate-supabase-db-url.mjs', import.meta.url));

function check(uri, expectedDiagnostic) {
  const result = spawnSync(process.execPath, [script], {
    env: { ...process.env, SUPABASE_DB_URL: uri },
    encoding: 'utf8',
  });
  assert.equal(result.status === 0, expectedDiagnostic === undefined);
  if (expectedDiagnostic) assert.match(result.stderr, new RegExp(expectedDiagnostic));
  assert.doesNotMatch(result.stdout + result.stderr, /dummy/);
}

test('accepts the OpenOI session-pooler URI with required TLS', () => {
  check(valid);
  check(valid.replace(':dummy@', ':password@'));
  check(valid.replace(':dummy@', ':%5Bactual-secret%5D@'));
});

test('reports the failing URI field without echoing credentials', () => {
  for (const [uri, reason] of [
    ['', 'missing or empty'],
    ['not-a-url', 'cannot be parsed'],
    [valid.replace('postgresql:', 'https:'), 'scheme'],
    [valid.replace('postgres.rnwojkpmsmypeaetxknr', 'postgres.other-project'), 'username'],
    [valid.replace(':dummy@', '@'), 'password is missing'],
    [valid.replace(':dummy@', ':%5BYOUR-PASSWORD%5D@'), 'password is a placeholder'],
    [valid.replace(':dummy@', ':URL_ENCODED_PASSWORD@'), 'password is a placeholder'],
    [valid.replace(':dummy@', ':dum%ZZy@'), 'invalid percent escape'],
    [valid.replace('pooler.supabase.com', 'example.com'), 'host'],
    [valid.replace(':5432/', ':6543/'), 'port'],
    [valid.replace('/postgres?', '/other?'), 'database path'],
    [valid.replace('sslmode=require', 'sslmode=disable'), 'query'],
    [valid.replace('sslmode=require', 'sslmode=require&sslmode=disable'), 'query'],
    [valid + '&host=evil.example.com', 'query'],
    [valid + '&user=postgres.other-project', 'query'],
    [valid + ' ', 'leading or trailing whitespace'],
    [valid.replace('dummy', 'dum my'), 'unencoded whitespace'],
    [valid.replace('?sslmode=require', ''), 'query'],
    [valid + '#fragment', 'fragment'],
  ]) check(uri, reason);
});
