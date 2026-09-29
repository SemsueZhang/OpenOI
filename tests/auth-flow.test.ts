import assert from 'node:assert/strict';
import test from 'node:test';
import { classifySignInFailure, EMAIL_NOT_CONFIRMED, showConfirmationResend } from '../lib/auth-flow';

test('unconfirmed sign-in offers another confirmation email', () => {
  const error = classifySignInFailure({ code: 'email_not_confirmed' });
  assert.equal(error, EMAIL_NOT_CONFIRMED);
  assert.equal(showConfirmationResend(false, false, error), true);
});

test('other sign-in errors do not expose the confirmation flow', () => {
  const error = classifySignInFailure({ code: 'invalid_credentials' });
  assert.equal(error, 'credentials');
  assert.equal(showConfirmationResend(false, false, error), false);
  assert.equal(showConfirmationResend(false, false, ''), false);
});

test('registration success and an expired confirmation link still offer resend', () => {
  assert.equal(showConfirmationResend(false, true, ''), true);
  assert.equal(showConfirmationResend(true, false, ''), true);
});
