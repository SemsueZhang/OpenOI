import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseConfig } from './config';

export function createSupabaseServerClient() {
  const config = supabaseConfig();
  if (!config) return null;
  const cookieStore = cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server components cannot write cookies; middleware refreshes sessions.
        }
      }
    }
  });
}
