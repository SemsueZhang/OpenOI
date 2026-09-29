import assert from 'node:assert/strict';
import { test } from 'node:test';
import { characterCount, cleanTags, contentSchema, httpUrlSchema, parseUrlLines, PROBLEM_TAGS, safeSitePath, usernameSchema } from '../lib/security';

test('auth redirect stays on the site, including encoded browser edge cases', () => {
  for (const attack of [
    'https://evil.example/steal', 'javascript:alert(1)', '//evil.example/steal',
    '/\\evil.example', '/%5cevil.example', '/%2f%2fevil.example',
    '/%0d%0aLocation:%20https://evil.example', '/%zz'
  ]) assert.equal(safeSitePath(attack, '/safe'), '/safe', attack);
  assert.equal(safeSitePath('/problems/123?tag=dp#solutions'), '/problems/123?tag=dp#solutions');
});

test('profile and content URL rules reject script and data schemes', () => {
  for (const attack of ['javascript:alert(1)', 'data:image/svg+xml,<svg/onload=alert(1)>', 'file:///etc/passwd', 'ftp://host/image.png']) {
    assert.equal(httpUrlSchema.safeParse(attack).success, false, attack);
  }
  assert.equal(httpUrlSchema.safeParse('https://example.com/avatar.png').success, true);
  assert.equal(usernameSchema.safeParse('Admin').success, false);
  assert.equal(usernameSchema.safeParse('a'.repeat(33)).success, false);
  assert.equal(usernameSchema.safeParse('user_09').success, true);
});

test('tags use the fixed taxonomy and deduplicate', () => {
  assert.deepEqual(PROBLEM_TAGS, ['图论', '数据结构', '组合优化', '数学', '搜索', '计算几何', '字符串', '特殊题型']);
  assert.deepEqual(cleanTags(' 图论,数学, 图论 '), ['图论', '数学']);
  assert.throws(() => cleanTags('dp'));
});

test('content limits count Unicode codepoints and require nonblank text', () => {
  assert.equal(characterCount('😀中'), 2);
  assert.equal(contentSchema(2).safeParse('😀中').success, true);
  assert.equal(contentSchema(1).safeParse('😀中').success, false);
  assert.equal(contentSchema(100).safeParse(' \n ').success, false);
  assert.equal(contentSchema(1000).safeParse('😀'.repeat(1000)).success, true);
  assert.equal(contentSchema(1000).safeParse('😀'.repeat(1001)).success, false);
});

test('URL lists enforce HTTP(S), count, length and uniqueness', () => {
  assert.deepEqual(parseUrlLines(' https://example.com/a \n\nhttp://example.org/b\r\n'), ['https://example.com/a', 'http://example.org/b']);
  assert.deepEqual(parseUrlLines(''), []);
  assert.throws(() => parseUrlLines('https://example.com\nhttps://example.com'));
  assert.throws(() => parseUrlLines('javascript:alert(1)'));
  assert.throws(() => parseUrlLines(`https://example.com/${'x'.repeat(2049)}`));
  assert.throws(() => parseUrlLines(Array.from({ length: 21 }, (_, i) => `https://example.com/${i}`).join('\n')));
});
