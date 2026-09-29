import { spawnSync } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const manifestPath = '/private/tmp/openoi-ui-fixtures.json';
const fixture = JSON.parse(await readFile(manifestPath, 'utf8'));
if (fixture.apiUrl !== 'http://127.0.0.1:54321' || !Array.isArray(fixture.userIds)) {
  throw new Error('Refusing to clean a nonlocal or malformed fixture.');
}
const cli = spawnSync('npx', ['--yes', 'supabase@2.58.5', 'status', '-o', 'json'], {
  encoding: 'utf8',
  env: { ...process.env, npm_config_cache: process.env.npm_config_cache || '/private/tmp/openoi-npm-cache' },
});
if (cli.status !== 0) throw new Error('Local Supabase is not running.');
const status = JSON.parse(cli.stdout.slice(cli.stdout.indexOf('{')));
if (status.API_URL !== fixture.apiUrl) throw new Error('Local Supabase address changed.');
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
for (const userId of fixture.userIds) {
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Fixture cleanup failed for ${userId}: ${error.message}`);
}
await unlink(manifestPath);
console.log(`Removed ${fixture.userIds.length} local UI users and their cascaded content.`);
