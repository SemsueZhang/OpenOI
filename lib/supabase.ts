'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig } from './supabase/config';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  const config = supabaseConfig();
  if (!config) return null;
  browserClient ??= createBrowserClient(config.url, config.key);
  return browserClient;
}
