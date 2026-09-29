import { cookies } from 'next/headers';
import type { Locale } from './types';

export const LOCALE_COOKIE = 'openoi_locale';
export async function getLocale(): Promise<Locale> {
  return (await cookies()).get(LOCALE_COOKIE)?.value === 'en' ? 'en' : 'zh';
}
