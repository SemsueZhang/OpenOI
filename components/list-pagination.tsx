'use client';

import Link from 'next/link';
import { useI18n } from '@/components/i18n';
import type { Paged } from '@/lib/types';

export function ListPagination<T>({ result, pathname, query, pageKey, anchor }: { result: Paged<T>; pathname: string; query: Record<string, string | undefined>; pageKey: string; anchor?: string }) {
  const { t } = useI18n();
  if (result.pages <= 1) return null;
  const href = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value && key !== pageKey) params.set(key, value);
    params.set(pageKey, String(page));
    return `${pathname}?${params}${anchor ? `#${anchor}` : ''}`;
  };
  return <nav className="mt-5 flex items-center justify-between gap-3 text-sm" aria-label={t('pagination')}><span className="text-muted">{t('page')} {result.page} {t('of')} {result.pages}</span><div className="flex gap-2"><Link aria-disabled={result.page <= 1} tabIndex={result.page <= 1 ? -1 : undefined} className={`rounded-lg border px-3 py-2 ${result.page <= 1 ? 'pointer-events-none border-edge text-muted' : 'border-edge bg-panel hover:border-electric'}`} href={href(Math.max(1, result.page - 1))}>{t('previous')}</Link><Link aria-disabled={result.page >= result.pages} tabIndex={result.page >= result.pages ? -1 : undefined} className={`rounded-lg border px-3 py-2 ${result.page >= result.pages ? 'pointer-events-none border-edge text-muted' : 'border-edge bg-panel hover:border-electric'}`} href={href(Math.min(result.pages, result.page + 1))}>{t('next')}</Link></div></nav>;
}
