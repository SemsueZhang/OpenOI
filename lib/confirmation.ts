type ConfirmationProof =
  | { kind: 'code'; code: string }
  | { kind: 'token_hash'; tokenHash: string; type: 'email' | 'signup' };

type ConfirmationAuth = {
  exchangeCodeForSession(code: string): Promise<{ error: unknown }>;
  verifyOtp(params: { token_hash: string; type: 'email' | 'signup' }): Promise<{ error: unknown }>;
};

export function confirmationProof(params: URLSearchParams): ConfirmationProof | null {
  const code = params.get('code');
  if (code?.trim()) return { kind: 'code', code };
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  if (tokenHash?.trim() && (type === 'email' || type === 'signup')) return { kind: 'token_hash', tokenHash, type };
  return null;
}

export function exchangeConfirmation(auth: ConfirmationAuth, proof: ConfirmationProof): Promise<{ error: unknown }> {
  return proof.kind === 'code'
    ? auth.exchangeCodeForSession(proof.code)
    : auth.verifyOtp({ token_hash: proof.tokenHash, type: proof.type });
}
