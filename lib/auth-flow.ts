export const EMAIL_NOT_CONFIRMED = 'email_not_confirmed' as const;

export function classifySignInFailure(error: { code?: string }): 'email_not_confirmed' | 'credentials' {
  return error.code === EMAIL_NOT_CONFIRMED ? EMAIL_NOT_CONFIRMED : 'credentials';
}

export function showConfirmationResend(confirmationError: boolean, registrationSucceeded: boolean, signInError: string): boolean {
  return confirmationError || registrationSucceeded || signInError === EMAIL_NOT_CONFIRMED;
}
