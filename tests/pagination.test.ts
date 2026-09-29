import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePage, pageForRank, pageRange } from '../lib/pagination';

test('server ranges can reach records beyond Supabase’s 1000-row response cap', () => {
  assert.deepEqual(pageRange(1), [0, 19]);
  assert.deepEqual(pageRange(50), [980, 999]);
  assert.deepEqual(pageRange(51), [1000, 1019]);
});

test('Hack rank resolves boundary rows to their correct page', () => {
  assert.equal(pageForRank(0), 1);
  assert.equal(pageForRank(19), 1);
  assert.equal(pageForRank(20), 2);
  assert.equal(pageForRank(1000), 51);
});

test('invalid page values resolve to the first page', () => {
  for (const value of [0, -1, NaN, Infinity, 1.2, Number.MAX_SAFE_INTEGER + 1]) assert.equal(normalizePage(value), 1);
});
