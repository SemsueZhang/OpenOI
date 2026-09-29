import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const cli = spawnSync('npx', ['--yes', 'supabase@2.58.5', 'status', '-o', 'json'], {
  encoding: 'utf8',
  env: { ...process.env, npm_config_cache: process.env.npm_config_cache || '/private/tmp/openoi-npm-cache' },
});
if (cli.status !== 0) throw new Error('Start local Supabase before creating UI fixtures.');
const status = JSON.parse(cli.stdout.slice(cli.stdout.indexOf('{')));
const api = new URL(status.API_URL);
const mail = new URL(status.INBUCKET_URL);
if (api.origin !== 'http://127.0.0.1:54321' || mail.origin !== 'http://127.0.0.1:54324') {
  throw new Error('Refusing nonlocal Supabase services.');
}
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(api.origin, status.ANON_KEY, options);
const admin = createClient(api.origin, status.SERVICE_ROLE_KEY, options);
const users = [];
const marker = randomBytes(5).toString('hex');
const password = `OpenOI-${randomBytes(20).toString('base64url')}aA1!`;
const manifestPath = '/private/tmp/openoi-ui-fixtures.json';

function ok(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}
async function tokenFor(email) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await fetch(`${mail.origin}/api/v1/messages?limit=50`);
    if (response.ok) {
      const { messages = [] } = await response.json();
      for (const message of messages) {
        if (!JSON.stringify(message.To || []).toLowerCase().includes(email.toLowerCase())) continue;
        const detailResponse = await fetch(`${mail.origin}/api/v1/message/${encodeURIComponent(message.ID)}`);
        if (!detailResponse.ok) continue;
        const detail = await detailResponse.json();
        const match = JSON.stringify(detail).match(/token_hash=([A-Za-z0-9._-]+)/);
        if (match) return match[1];
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Local confirmation email not received for ${email}.`);
}

try {
  for (const suffix of ['alice', 'bob']) {
    const email = `openoi-ui-${marker}-${suffix}@example.test`;
    const username = `ui_${marker}_${suffix}`;
    const signup = ok(await anon.auth.signUp({
      email, password,
      options: { data: { username }, emailRedirectTo: 'http://localhost:3001/auth/confirm?next=%2F' },
    }), `${suffix} signup`);
    assert(signup.user?.id);
    users.push({ id: signup.user.id, email, username, suffix });
  }
  const [alice, bob] = users;
  const problem = ok(await admin.from('problems').insert({
    created_by: alice.id,
    title: `UI 验收题目 ${marker}`,
    source: 'OpenOI local fixture',
    difficulty: 'medium',
    tags: ['local', 'dp'],
    statement_md: '# 测试题目\n\n这是隔离环境中的测试题面。',
  }).select('id').single(), 'problem fixture');
  const solution = ok(await admin.from('solutions').insert({
    problem_id: problem.id,
    author_id: alice.id,
    title: `动态规划解法 ${marker}`,
    algorithm: '动态规划',
    content_md: '## 思路\n\n用状态转移解决问题。',
    language: 'typescript',
    code: 'const answer = 42;',
    time_complexity: 'O(n)',
    space_complexity: 'O(n)',
  }).select('id').single(), 'solution fixture');

  const hacks = ok(await admin.from('hacks').insert(Array.from({ length: 21 }, (_, i) => ({
    solution_id: solution.id,
    author_id: bob.id,
    type: i % 2 === 0 ? 'logic' : 'boundary',
    content_md: `第 ${i + 1} 个 Hack：检查边界条件。`,
    input_data: String(i + 1),
    expected_output: String(i + 1),
    actual_output: '0',
  }))).select('id,content_md'), 'hack fixtures');
  assert.equal(hacks.length, 21);
  const focusHack = hacks.find((hack) => hack.content_md.startsWith('第 21 个 Hack'));
  assert(focusHack?.id);

  const comments = [
    ...Array.from({ length: 21 }, (_, i) => ({
      author_id: bob.id, target_type: 'solution', target_id: solution.id,
      content_md: `解法评论 ${i + 1}：本地分页验收。`,
    })),
    ...Array.from({ length: 21 }, (_, i) => ({
      author_id: alice.id, target_type: 'hack', target_id: focusHack.id,
      content_md: `Hack 作者回应 ${i + 1}：本地分页验收。`,
    })),
  ];
  ok(await admin.from('comments').insert(comments), 'comment fixtures');

  const next = encodeURIComponent(`/solutions/${solution.id}`);
  for (const user of users) {
    const token = await tokenFor(user.email);
    user.confirmUrl = `http://localhost:3001/auth/confirm?next=${next}&token_hash=${encodeURIComponent(token)}&type=email`;
  }
  const manifest = {
    apiUrl: api.origin,
    userIds: users.map(({ id }) => id),
    users: users.map(({ id, email, username, suffix, confirmUrl }) => ({ id, email, username, suffix, confirmUrl })),
    problemId: problem.id,
    solutionId: solution.id,
    focusHackId: focusHack.id,
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ manifestPath, problemId: problem.id, solutionId: solution.id,
    focusHackId: focusHack.id, users: users.map(({ suffix, username, confirmUrl }) => ({ suffix, username, confirmUrl })) }, null, 2));
} catch (error) {
  for (const user of users) await admin.auth.admin.deleteUser(user.id);
  throw error;
}
