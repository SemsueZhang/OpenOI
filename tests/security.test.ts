import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanTags, httpUrlSchema, safeSitePath, usernameSchema } from '../lib/security';

test('auth redirect stays on the site, including encoded browser edge cases', () => {
  for (const attack of [
    'https://evil.example/steal', 'javascript:alert(1)', '//evil.example/steal',
    '/\\evil.example', '/%5cevil.example', '/%2f%2fevil.example',
    '/%0d%0aLocation:%20https://evil.example', '/%zz'
  ]) assert.equal(safeSitePath(attack, '/safe'), '/safe', attack);
  assert.equal(safeSitePath('/problems/123?tag=dp#solutions'), '/problems/123?tag=dp#solutions');
});

test('profile and external URL rules reject script and data schemes', () => {
  for (const attack of ['javascript:alert(1)', 'data:image/svg+xml,<svg/onload=alert(1)>', 'file:///etc/passwd', 'ftp://host/image.png']) {
    assert.equal(httpUrlSchema.safeParse(attack).success, false, attack);
  }
  assert.equal(httpUrlSchema.safeParse('https://example.com/avatar.png').success, true);
  assert.equal(usernameSchema.safeParse('Admin').success, false);
  assert.equal(usernameSchema.safeParse('a'.repeat(33)).success, false);
  assert.equal(usernameSchema.safeParse('user_09').success, true);
});

test('free-form tags deduplicate and reject oversized submissions', () => {
  assert.deepEqual(cleanTags(' dp, graph, dp '), ['dp', 'graph']);
  assert.throws(() => cleanTags(Array.from({ length: 13 }, (_, i) => `tag${i}`).join(',')));
  assert.throws(() => cleanTags('x'.repeat(33)));
});
