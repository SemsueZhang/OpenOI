import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

// This test discovers a running local Supabase stack. Never accept a hosted URL.
const cli = spawnSync('npx', ['--yes', 'supabase@2.58.5', 'status', '-o', 'json'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: { ...process.env, npm_config_cache: process.env.npm_config_cache || '/private/tmp/openoi-npm-cache' },
});
if (cli.status !== 0) throw new Error('Local Supabase is not running. Start it with npx supabase@2.58.5 start.');
const jsonStart = cli.stdout.indexOf('{');
if (jsonStart < 0) throw new Error('Supabase CLI returned no status JSON.');
const status = JSON.parse(cli.stdout.slice(jsonStart));
const apiUrl = new URL(status.API_URL);
const mailUrl = new URL(status.INBUCKET_URL);
for (const url of [apiUrl, mailUrl]) {
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Refusing a nonlocal Supabase service.');
}
if (apiUrl.port !== '54321' || mailUrl.port !== '54324') throw new Error('Unexpected local Supabase ports.');
const anonKey = status.ANON_KEY;
const serviceKey = status.SERVICE_ROLE_KEY;
if (!anonKey || !serviceKey) throw new Error('Local Supabase keys unavailable.');

const opts = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const anonymous = createClient(apiUrl.origin, anonKey, opts);
const admin = createClient(apiUrl.origin, serviceKey, opts);
const users = [];
const marker = randomBytes(5).toString('hex');
const password = `OpenOI-${randomBytes(20).toString('base64url')}aA1!`;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function ok(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}
async function confirmationToken(email) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    // Current Supabase CLI runs Mailpit; earlier releases used Inbucket.
    const mailpitList = await fetch(`${mailUrl.origin}/api/v1/messages?limit=50`);
    if (mailpitList.ok) {
      const { messages = [] } = await mailpitList.json();
      for (const message of messages) {
        if (!JSON.stringify(message.To || []).toLowerCase().includes(email.toLowerCase())) continue;
        const detailResponse = await fetch(`${mailUrl.origin}/api/v1/message/${encodeURIComponent(message.ID)}`);
        if (!detailResponse.ok) continue;
        const detail = await detailResponse.json();
        const match = JSON.stringify(detail).match(/token_hash=([A-Za-z0-9._-]+)/);
        if (match) return match[1];
      }
    }
    for (const mailbox of [email, email.split('@')[0]]) {
      const base = `${mailUrl.origin}/api/v1/mailbox/${encodeURIComponent(mailbox)}`;
      const listResponse = await fetch(base);
      if (!listResponse.ok) continue;
      const list = await listResponse.json();
      for (const message of (Array.isArray(list) ? list : (list.messages || list.data || []))) {
        const detailResponse = await fetch(`${base}/${encodeURIComponent(message.id || message.ID)}`);
        if (!detailResponse.ok) continue;
        const detail = await detailResponse.json();
        const match = JSON.stringify(detail).match(/token_hash=([A-Za-z0-9._-]+)/);
        if (match) return match[1];
      }
    }
    await pause(500);
  }
  throw new Error(`No confirmation message reached local mail viewer for ${email}.`);
}
async function signUpAndConfirm(suffix) {
  const client = createClient(apiUrl.origin, anonKey, opts);
  const email = `openoi-${marker}-${suffix}@example.test`;
  const username = `test_${marker}_${suffix}`;
  const signed = ok(await client.auth.signUp({
    email, password,
    options: { data: { username }, emailRedirectTo: 'http://localhost:3000/auth/confirm?next=%2F' },
  }), 'signUp');
  assert(signed.user?.id, 'signUp returned no user');
  users.push(signed.user.id);
  assert.equal(signed.session, null, 'unconfirmed signup unexpectedly has a session');

  const profile = ok(await anonymous.from('profiles').select('username').eq('id', signed.user.id).single(), 'registration profile');
  assert.equal(profile.username, username);
  const unconfirmed = await client.auth.signInWithPassword({ email, password });
  assert(unconfirmed.error, 'unconfirmed account could sign in');
  assert.equal(unconfirmed.error.code, 'email_not_confirmed', 'unexpected unconfirmed login error');

  const token_hash = await confirmationToken(email);
  ok(await client.auth.verifyOtp({ token_hash, type: 'email' }), 'email confirmation');
  ok(await client.auth.signOut(), 'signOut after confirmation');
  assert((await client.auth.signInWithPassword({ email, password: `${password}wrong` })).error, 'wrong password accepted');
  ok(await client.auth.signInWithPassword({ email, password }), 'confirmed signIn');
  return { client, userId: signed.user.id, email };
}

async function verifyPkceCodeFlow(email) {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const pkce = createClient(apiUrl.origin, anonKey, {
    auth: { flowType: 'pkce', autoRefreshToken: false, persistSession: true, detectSessionInUrl: false, storage },
  });
  ok(await pkce.auth.signInWithOtp({ email, options: { emailRedirectTo: 'http://localhost:3001/auth/confirm?next=%2F' } }), 'PKCE magic link request');
  let verifyUrl;
  for (let attempt = 0; attempt < 40 && !verifyUrl; attempt += 1) {
    const response = await fetch(`${mailUrl.origin}/api/v1/messages?limit=50`);
    const list = response.ok ? await response.json() : { messages: [] };
    for (const message of list.messages || []) {
      if (!JSON.stringify(message.To || []).toLowerCase().includes(email.toLowerCase())) continue;
      if (message.Subject === '确认 OpenOI 邮箱') continue;
      const detailResponse = await fetch(`${mailUrl.origin}/api/v1/message/${encodeURIComponent(message.ID)}`);
      if (!detailResponse.ok) continue;
      const detail = await detailResponse.json();
      const href = detail.HTML?.match(/href=["']([^"']+)["']/i)?.[1];
      if (href) verifyUrl = new URL(href.replaceAll('&amp;', '&'));
      if (verifyUrl) break;
    }
    if (!verifyUrl) await pause(500);
  }
  if (!verifyUrl || !['localhost', '127.0.0.1'].includes(verifyUrl.hostname) || !verifyUrl.pathname.endsWith('/auth/v1/verify')) {
    throw new Error('Local PKCE magic link was not delivered.');
  }
  const redirected = await fetch(verifyUrl, { redirect: 'manual' });
  const location = redirected.headers.get('location');
  if (!location) throw new Error('PKCE verify link did not redirect.');
  const code = new URL(location).searchParams.get('code');
  if (!code) throw new Error('PKCE verify link did not return code.');
  ok(await pkce.auth.exchangeCodeForSession(code), 'PKCE code exchange');
  ok(await pkce.auth.signOut(), 'PKCE signOut');
}

try {
  const anonymousWrite = await anonymous.from('problems').insert({ title: 'anon', statement_md: 'x' });
  assert(anonymousWrite.error, 'anonymous content write accepted');
  const alice = await signUpAndConfirm('a');
  const bob = await signUpAndConfirm('b');
  await verifyPkceCodeFlow(alice.email);

  const problem = ok(await alice.client.from('problems')
    .insert({ title: `Local test ${marker}`, source_urls: ['https://example.org/problem'], tags: ['数学'], statement_md: '# Statement' })
    .select('id,created_by').single(), 'problem insert');
  assert.equal(problem.created_by, alice.userId);
  const oversized = await alice.client.from('problems').update({ title: 'x'.repeat(201) }).eq('id', problem.id);
  assert(oversized.error, 'oversized title accepted');
  const excessiveTags = await alice.client.from('problems').update({ tags: ['数学', 'unknown'] }).eq('id', problem.id);
  assert(excessiveTags.error, 'unknown tag accepted');

  const solution = ok(await alice.client.from('solutions')
    .insert({ problem_id: problem.id, title: 'Explanation', content_md: 'Proof', original_url: 'https://example.org/solution' })
    .select('id,author_id').single(), 'solution insert');
  assert.equal(solution.author_id, alice.userId);
  const summary = ok(await anonymous.from('solution_summaries').select('original_url').eq('id', solution.id).single(), 'solution summary');
  assert.equal(summary.original_url, 'https://example.org/solution');
  assert((await bob.client.from('comments').insert({ target_type: 'hack', target_id: solution.id, content_md: 'No' })).error, 'hack comment accepted');

  const unauthorized = ok(await bob.client.from('problems').update({ title: 'Hijacked' }).eq('id', problem.id).select('id'), 'other author update');
  assert.equal(unauthorized.length, 0);
  assert((await bob.client.from('comments').insert({ target_type: 'solution', target_id: randomUUID(), content_md: 'orphan' })).error, 'orphan comment accepted');

  const pageRows = Array.from({ length: 21 }, (_, i) => ({ title: `Page ${marker} ${i}`, statement_md: 'fixture' }));
  ok(await alice.client.from('problems').insert(pageRows), 'pagination fixtures');
  const filter = `Page ${marker}%`;
  const page1 = ok(await anonymous.from('problem_summaries').select('id').like('title', filter).order('created_at').order('id').range(0, 19), 'page 1');
  const page2 = ok(await anonymous.from('problem_summaries').select('id').like('title', filter).order('created_at').order('id').range(20, 39), 'page 2');
  assert.equal(page1.length, 20);
  assert.equal(page2.length, 1);

  const stressComments = Array.from({ length: 1001 }, (_, i) => ({
    target_type: 'solution', target_id: solution.id, content_md: `local pagination ${marker} ${i}`,
  }));
  ok(await bob.client.from('comments').insert(stressComments), '1001 comment fixtures');
  const deepPage = ok(await anonymous.from('comments').select('id').eq('target_type', 'solution')
    .eq('target_id', solution.id).order('created_at').order('id').range(1000, 1019), 'deep comment page');
  assert.equal(deepPage.length, 1);
  const countResult = await anonymous.from('comments').select('id', { count: 'exact', head: true })
    .eq('target_type', 'solution').eq('target_id', solution.id);
  ok(countResult, 'exact comment count');
  assert.equal(countResult.count, 1001);

  console.log('Local Supabase Auth, mail, RLS, content and pagination tests passed');
} finally {
  let cleanupFailed = false;
  for (const userId of users.reverse()) {
    const deleted = await admin.auth.admin.deleteUser(userId);
    if (deleted.error) {
      cleanupFailed = true;
      console.error(`Test user cleanup failed for ${userId}: ${deleted.error.message}`);
    }
  }
  if (cleanupFailed) throw new Error('Local test user cleanup failed.');
}
