'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Problem, Solution } from '@/lib/types';
import { useI18n } from '@/components/i18n';
import { Badge } from '@/components/ui/badge';

export function DateText({ value }: { value: string }) {
  const { locale } = useI18n();
  return <time dateTime={value}>{new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value))}</time>;
}
export function AuthorLink({ username }: { username?: string | null }) {
  return username ? <Link className="font-medium text-ink hover:text-electric" href={`/profile/${encodeURIComponent(username)}`}>@{username}</Link> : <span className="text-muted">—</span>;
}
export function ProblemCard({ problem }: { problem: Problem }) {
  const { t } = useI18n();
  return <article className="group rounded-xl border border-edge bg-panel p-5 shadow-[inset_0_1px_0_rgba(155,180,255,.035)] transition-all hover:border-electric/60 hover:bg-panel-elevated/70 hover:shadow-[0_0_28px_rgba(83,173,255,.09)]"><div className="flex items-start justify-between gap-3"><Link href={`/problems/${problem.id}`} className="text-lg font-semibold tracking-tight text-ink group-hover:text-electric">{problem.title}</Link><ArrowUpRight size={18} className="mt-1 shrink-0 text-muted group-hover:text-electric"/></div><div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">{problem.created_by ? <AuthorLink username={problem.author?.username}/> : <span className="font-medium text-ink">OpenOI</span>}<span>·</span><DateText value={problem.created_at}/>{problem.tags?.map(tag => <Badge key={tag}>#{tag}</Badge>)}<span className="ml-auto">{problem.solution_count ?? 0} {t('solutions')}</span></div></article>;
}
export function SolutionCard({ solution }: { solution: Solution }) {
  return <article className="rounded-xl border border-edge bg-panel p-5 shadow-[inset_0_1px_0_rgba(155,180,255,.035)] transition-all hover:border-violet/60 hover:bg-panel-elevated/70 hover:shadow-[0_0_28px_rgba(165,138,255,.09)]"><Link href={`/solutions/${solution.id}`} className="text-lg font-semibold text-ink hover:text-electric">{solution.title}</Link><div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted"><AuthorLink username={solution.author?.username}/><span>·</span><DateText value={solution.created_at}/></div></article>;
}
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) { return <div className="rounded-xl border border-dashed border-edge bg-panel px-6 py-14 text-center"><p className="font-semibold text-ink">{title}</p>{hint && <p className="mt-2 text-sm text-muted">{hint}</p>}{action && <div className="mt-5">{action}</div>}</div>; }
export function ConfigNotice() { const { t } = useI18n(); return <div className="rounded-xl border border-electric/30 bg-electric/10 p-6"><h2 className="font-semibold text-ink">{t('configTitle')}</h2><p className="mt-2 text-sm leading-6 text-muted">{t('configText')}</p></div>; }
