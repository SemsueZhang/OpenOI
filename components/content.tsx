'use client';

import Link from 'next/link';
import { ArrowUpRight, MessageSquare, ShieldCheck } from 'lucide-react';
import type { Difficulty, HackStatus, Problem, Solution, SolutionStatus } from '@/lib/types';
import { useI18n } from '@/components/i18n';
import { Badge } from '@/components/ui/badge';

export function DifficultyBadge({ value }: { value: Difficulty }) {
  const { t } = useI18n();
  return <Badge tone={value === 'easy' ? 'green' : value === 'medium' ? 'amber' : 'red'}>{t(value)}</Badge>;
}
export function SolutionStatusBadge({ value }: { value: SolutionStatus }) {
  const { t } = useI18n();
  return <Badge tone={value === 'normal' ? 'green' : value === 'disputed' ? 'amber' : 'red'}>{t(value)}</Badge>;
}
export function HackStatusBadge({ value }: { value: HackStatus }) {
  const { t } = useI18n();
  return <Badge tone={value === 'pending' ? 'amber' : value === 'valid' ? 'red' : 'stone'}>{t(value)}</Badge>;
}
export function DateText({ value }: { value: string }) {
  const { locale } = useI18n();
  return <time dateTime={value}>{new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value))}</time>;
}
export function AuthorLink({ username }: { username?: string | null }) {
  return username ? <Link className="font-medium text-ink hover:text-electric" href={`/profile/${encodeURIComponent(username)}`}>@{username}</Link> : <span className="text-muted">—</span>;
}
export function ProblemCard({ problem }: { problem: Problem }) {
  const { t } = useI18n();
  return <article className="group rounded-xl border border-edge bg-panel p-5 shadow-[inset_0_1px_0_rgba(155,180,255,.035)] transition-all hover:border-electric/60 hover:bg-panel-elevated/70 hover:shadow-[0_0_28px_rgba(83,173,255,.09)]">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="mb-3 flex flex-wrap items-center gap-2"><DifficultyBadge value={problem.difficulty} />{problem.source && <span className="text-xs text-muted">{problem.source}</span>}</div><Link href={`/problems/${problem.id}`} className="text-lg font-semibold tracking-tight text-ink group-hover:text-electric">{problem.title}</Link></div><ArrowUpRight size={18} className="mt-1 shrink-0 text-muted group-hover:text-electric" /></div>
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted"><AuthorLink username={problem.author?.username} /><span>·</span><DateText value={problem.created_at} />{problem.tags?.map(tag => <Badge key={tag}>#{tag}</Badge>)}<span className="ml-auto inline-flex items-center gap-1"><MessageSquare size={14}/>{problem.solution_count ?? 0} {t('solutions')}</span></div>
  </article>;
}
export function SolutionCard({ solution }: { solution: Solution }) {
  const { t } = useI18n();
  return <article className="rounded-xl border border-edge bg-panel p-5 shadow-[inset_0_1px_0_rgba(155,180,255,.035)] transition-all hover:border-violet/60 hover:bg-panel-elevated/70 hover:shadow-[0_0_28px_rgba(165,138,255,.09)]"><div className="flex flex-wrap items-start justify-between gap-3"><Link href={`/solutions/${solution.id}`} className="text-lg font-semibold text-ink hover:text-electric">{solution.title}</Link><SolutionStatusBadge value={solution.status}/></div><div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted"><AuthorLink username={solution.author?.username}/><span>·</span><DateText value={solution.created_at}/>{solution.language && <Badge tone="blue">{solution.language}</Badge>}{solution.time_complexity && <code className="rounded bg-panel-elevated px-1.5 py-0.5">{solution.time_complexity}</code>}</div><div className="mt-4 flex items-center gap-4 text-xs text-muted"><span className="inline-flex items-center gap-1"><ShieldCheck size={14}/>{solution.useful_votes ?? 0} {t('votes')}</span><span>{solution.hack_count ?? 0} {t('hacks')}</span></div></article>;
}
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-edge bg-panel px-6 py-14 text-center"><p className="font-semibold text-ink">{title}</p>{hint && <p className="mt-2 text-sm text-muted">{hint}</p>}{action && <div className="mt-5">{action}</div>}</div>;
}
export function ConfigNotice() {
  const { t } = useI18n();
  return <div className="rounded-xl border border-electric/30 bg-electric/10 p-6"><h2 className="font-semibold text-ink">{t('configTitle')}</h2><p className="mt-2 text-sm leading-6 text-muted">{t('configText')}</p></div>;
}
