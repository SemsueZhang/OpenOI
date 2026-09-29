import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { safeSitePath } from '@/lib/security';
import { supabaseConfig } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  const next = safeSitePath(request.nextUrl.searchParams.get('next'));
  const destination = new URL(next, request.nextUrl.origin);
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  const config = supabaseConfig();
  const failure = new URL('/login', request.nextUrl.origin);
  failure.searchParams.set('error', 'confirmation');
  failure.searchParams.set('next', next);
  if (!config || !tokenHash || !['email', 'signup'].includes(type ?? '')) {
    return NextResponse.redirect(failure);
  }
  let response = NextResponse.redirect(destination);
  const db = createServerClient(config.url, config.key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.redirect(destination);
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });
  const { error } = await db.auth.verifyOtp({ token_hash: tokenHash, type: type as 'email' | 'signup' });
  if (error) return NextResponse.redirect(failure);
  return response;
}
