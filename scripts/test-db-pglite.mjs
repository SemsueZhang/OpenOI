// Isolated PostgreSQL WASM smoke test; run through scripts/test-db-pglite.sh.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const entry = process.argv[2];
if (!entry) throw new Error('Pass the PGlite dist/index.js path');
const { PGlite } = await import(pathToFileURL(entry).href);
const db = new PGlite();
const read = (path) => readFileSync(path, 'utf8').replace(/^\\set.*$/gm, '');
const run = async (path, sql = read(path)) => {
  await db.exec(sql);
  console.log(`PASS ${path}`);
};
try {
  await run('tests/database/plain_postgres_bootstrap.sql');
  // PGlite does not bundle pgcrypto. PostgreSQL's built-in gen_random_uuid()
  // has the same behavior needed by these tests.
  const initial = read('supabase/migrations/20260929000000_initial.sql')
    .replace('create extension if not exists pgcrypto with schema extensions;', '')
    .replaceAll('extensions.gen_random_uuid()', 'gen_random_uuid()');
  await run('supabase/migrations/20260929000000_initial.sql', initial);
  await run('supabase/migrations/20260929010000_content_limits.sql');
  await run('tests/database/legacy_fixture.sql');
  const history = read('scripts/baseline-migration-history.sql');
  let earlyHistoryError;
  try { await db.exec(history); } catch (error) { earlyHistoryError = error; }
  assert(earlyHistoryError, 'History adoption must reject incomplete legacy schema');
  await db.exec('rollback;');
  console.log('PASS history adoption rejects incomplete schema');

  const migration = read('supabase/migrations/20260929020000_simplify_content.sql');
  let refusal;
  try { await db.exec(migration); } catch (error) { refusal = error; }
  assert(refusal?.message.includes('original_url'), 'Missing original URL must fail preflight');
  await db.exec('rollback;');
  assert.equal((await db.query("select count(*)::int n from public.hacks")).rows[0].n, 1,
    'Failed migration must preserve legacy data');
  assert.equal((await db.query("select count(*)::int n from information_schema.columns where table_schema='public' and table_name='solutions' and column_name='original_url'")).rows[0].n, 0,
    'Failed migration must roll back its schema changes');
  console.log('PASS transaction preflight and rollback');

  await db.exec("alter table public.solutions add column original_url text; update public.solutions set original_url='https://example.org/solution' where id='c3000000-0000-4000-8000-000000000001';");
  for (const [label, change, repair] of [
    ['statement', "update public.problems set statement_md=repeat('x',1001) where id='b3000000-0000-4000-8000-000000000001'", "update public.problems set statement_md='Legacy statement' where id='b3000000-0000-4000-8000-000000000001'"],
    ['tags', "update public.problems set tags=array['legacy'] where id='b3000000-0000-4000-8000-000000000001'", "update public.problems set tags=array['图论'] where id='b3000000-0000-4000-8000-000000000001'"],
    ['summary', "update public.solutions set content_md=repeat('x',1001) where id='c3000000-0000-4000-8000-000000000001'", "update public.solutions set content_md='Legacy summary' where id='c3000000-0000-4000-8000-000000000001'"],
    ['comment', "update public.comments set content_md=repeat('x',101) where id='e3000000-0000-4000-8000-000000000001'", "update public.comments set content_md='Retained comment' where id='e3000000-0000-4000-8000-000000000001'"],
  ]) {
    await db.exec(change);
    let error;
    try { await db.exec(migration); } catch (caught) { error = caught; }
    assert(error, `Incompatible ${label} must fail preflight`);
    await db.exec('rollback;');
    await db.exec(repair);
  }
  console.log('PASS incompatible content preflight');
  await run('supabase/migrations/20260929020000_simplify_content.sql', migration);
  await run('tests/database/migration_preservation.sql');
  await run('scripts/baseline-migration-history.sql', history);
  await run('scripts/baseline-migration-history.sql', history);
  assert.equal((await db.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n, 3);
  await run('supabase/migrations/20260930000000_import_noi_problems.sql');
  await run('tests/database/noi_import.sql');
  await run('tests/database/acceptance.sql');
  await run('tests/database/content_limits.sql');
} finally {
  await db.close();
}
