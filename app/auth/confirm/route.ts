import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { safeSitePath } from '@/lib/security';
import { confirmationProof, exchangeConfirmation } from '@/lib/confirmation';
import { supabaseConfig } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  const next = safeSitePath(request.nextUrl.searchParams.get('next'));
  const destination = new URL(next, request.nextUrl.origin);
  const proof = confirmationProof(request.nextUrl.searchParams);
  const config = supabaseConfig();
  const failure = new URL('/login', request.nextUrl.origin);
  failure.searchParams.set('error', 'confirmation');
  failure.searchParams.set('next', next);
  if (!config || !proof) {
    return NextResponse.redirect(failure);
  }
  const response = NextResponse.redirect(destination);
  const db = createServerClient(config.url, config.key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      }
    }
  });
  const { error } = await exchangeConfirmation(db.auth, proof);
  if (error) return NextResponse.redirect(failure);
  return response;
}
