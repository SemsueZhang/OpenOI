'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useI18n } from '@/components/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ProblemFilters } from '@/lib/types';

export function ProblemFiltersForm({ filters }: { filters: ProblemFilters }) {
  const { t } = useI18n();
  return <form action="/" method="get" className="rounded-xl border border-edge bg-panel p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_150px_minmax(0,1fr)_auto]">
    <label className="relative"><span className="sr-only">{t('search')}</span><Search size={17} className="pointer-events-none absolute left-3 top-3 text-muted"/><Input className="pl-9" name="q" defaultValue={filters.q || ''} placeholder={t('searchPlaceholder')}/></label>
    <label><span className="sr-only">{t('source')}</span><Input name="source" defaultValue={filters.source || ''} placeholder={t('sourcePlaceholder')}/></label>
    <label><span className="sr-only">{t('difficulty')}</span><select name="difficulty" defaultValue={filters.difficulty || ''} className="h-10 w-full rounded-lg border border-edge bg-panel-elevated px-3 text-sm text-ink focus:border-electric focus:ring-2 focus:ring-electric/20"><option value="">{t('all')} {t('difficulty')}</option><option value="easy">{t('easy')}</option><option value="medium">{t('medium')}</option><option value="hard">{t('hard')}</option></select></label>
    <label><span className="sr-only">{t('tag')}</span><Input name="tag" defaultValue={filters.tag || ''} placeholder={t('tagPlaceholder')}/></label>
    <Button type="submit"><Search size={16}/>{t('filter')}</Button>
  </div><div className="mt-2 flex justify-end"><Link href="/" className="text-xs text-muted hover:text-electric">{t('reset')}</Link></div></form>;
}

export function Pagination({ filters, page, pages }: { filters: ProblemFilters; page: number; pages: number }) {
  const { t } = useI18n();
  if (pages <= 1) return null;
  const href = (target: number) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(filters)) if (key !== 'page' && value) params.set(key, String(value)); params.set('page', String(target)); return `/?${params}`; };
  return <nav className="mt-6 flex items-center justify-between text-sm" aria-label={t('pagination')}><span className="text-muted">{t('page')} {page} {t('of')} {pages}</span><div className="flex gap-2"><Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} className={`rounded-lg border px-3 py-2 ${page <= 1 ? 'pointer-events-none border-edge text-muted' : 'border-edge bg-panel hover:border-electric'}`} href={href(page - 1)}>{t('previous')}</Link><Link aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined} className={`rounded-lg border px-3 py-2 ${page >= pages ? 'pointer-events-none border-edge text-muted' : 'border-edge bg-panel hover:border-electric'}`} href={href(page + 1)}>{t('next')}</Link></div></nav>;
}
