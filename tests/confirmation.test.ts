import assert from 'node:assert/strict';
import test from 'node:test';
import { confirmationProof, exchangeConfirmation } from '../lib/confirmation';

test('default Supabase code confirmation exchanges the PKCE session', async () => {
  const proof = confirmationProof(new URLSearchParams('code=one-time-code&next=%2Fprofile'));
  assert.deepEqual(proof, { kind: 'code', code: 'one-time-code' });
  const calls: string[] = [];
  const result = await exchangeConfirmation({
    async exchangeCodeForSession(code) { calls.push(`code:${code}`); return { error: null }; },
    async verifyOtp() { calls.push('otp'); return { error: null }; },
  }, proof!);
  assert.equal(result.error, null);
  assert.deepEqual(calls, ['code:one-time-code']);
});

test('custom token-hash confirmation still verifies the signup OTP', async () => {
  const proof = confirmationProof(new URLSearchParams('token_hash=hashed-token&type=signup'));
  assert.deepEqual(proof, { kind: 'token_hash', tokenHash: 'hashed-token', type: 'signup' });
  const calls: string[] = [];
  await exchangeConfirmation({
    async exchangeCodeForSession() { calls.push('code'); return { error: null }; },
    async verifyOtp({ token_hash, type }) { calls.push(`${type}:${token_hash}`); return { error: null }; },
  }, proof!);
  assert.deepEqual(calls, ['signup:hashed-token']);
});

test('missing or invalid confirmation proof is rejected before calling Auth', () => {
  assert.equal(confirmationProof(new URLSearchParams()), null);
  assert.equal(confirmationProof(new URLSearchParams('code=%20%20')), null);
  assert.equal(confirmationProof(new URLSearchParams('token_hash=token&type=recovery')), null);
});
