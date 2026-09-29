'use client';

import Link from 'next/link';
import { ArrowUpRight, UserRound } from 'lucide-react';
import type { Hack, Paged, Problem, Profile, Solution } from '@/lib/types';
import { ListPagination } from '@/components/list-pagination';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/components/i18n';
import { DateText, EmptyState, HackStatusBadge, ProblemCard, SolutionCard } from '@/components/content';
import { Badge } from '@/components/ui/badge';

function Avatar({ src }: { src: string }) {
  // User provided URLs should bypass the Next image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-full w-full object-cover" />;
}

export function ProfileView({ profile, problems, solutions, hacks, isSelf }: { profile: Profile; problems: Paged<Problem>; solutions: Paged<Solution>; hacks: Paged<Hack>; isSelf: boolean }) {
  const { t } = useI18n();
  const query = Object.fromEntries(useSearchParams().entries());
  const pathname = `/profile/${encodeURIComponent(profile.username)}`;
  const avatar = profile.avatar_url && /^https?:\/\//i.test(profile.avatar_url) ? profile.avatar_url : null;
  return <div className="space-y-9"><header className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-edge bg-panel p-6"><div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-electric/15 text-electric">{avatar ? <Avatar src={avatar}/> : <UserRound size={28}/>}</div><div><h1 className="text-2xl font-bold text-ink">@{profile.username}</h1><p className="mt-1 text-sm text-muted">{t('memberSince')} <DateText value={profile.created_at}/></p></div></div>{isSelf && <Link href="/settings/profile" className="inline-flex h-9 items-center rounded-lg border border-edge px-3 text-sm font-medium hover:border-electric">{t('settings')}</Link>}</header><section id="profile-problems" className="scroll-mt-20"><h2 className="mb-4 text-xl font-semibold text-ink">{t('authoredProblems')} <span className="text-sm font-normal text-muted">{problems.total}</span></h2>{problems.items.length ? <div className="grid gap-3 sm:grid-cols-2">{problems.items.map(problem => <ProblemCard key={problem.id} problem={problem}/>)}</div> : <EmptyState title={t('emptyProblems')}/>}<ListPagination result={problems} pathname={pathname} query={query} pageKey="problemPage" anchor="profile-problems"/></section><section id="profile-solutions" className="scroll-mt-20"><h2 className="mb-4 text-xl font-semibold text-ink">{t('authoredSolutions')} <span className="text-sm font-normal text-muted">{solutions.total}</span></h2>{solutions.items.length ? <div className="grid gap-3 sm:grid-cols-2">{solutions.items.map(solution => <SolutionCard key={solution.id} solution={solution}/>)}</div> : <EmptyState title={t('emptySolutions')}/>}<ListPagination result={solutions} pathname={pathname} query={query} pageKey="solutionPage" anchor="profile-solutions"/></section><section id="profile-hacks" className="scroll-mt-20"><h2 className="mb-4 text-xl font-semibold text-ink">{t('authoredHacks')} <span className="text-sm font-normal text-muted">{hacks.total}</span></h2>{hacks.items.length ? <div className="space-y-2">{hacks.items.map(hack => <Link key={hack.id} href={`/solutions/${hack.solution_id}?hack=${hack.id}#hack-${hack.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-edge bg-panel p-4 hover:border-electric"><span className="flex flex-wrap items-center gap-2"><HackStatusBadge value={hack.status}/><Badge>{t(hack.type)}</Badge><span className="line-clamp-1 text-sm text-muted">{hack.content_md.replace(/[#*`_]/g, '').slice(0, 100)}</span></span><ArrowUpRight size={16} className="shrink-0 text-muted"/></Link>)}</div> : <EmptyState title={t('emptyHacks')}/>}<ListPagination result={hacks} pathname={pathname} query={query} pageKey="hackPage" anchor="profile-hacks"/></section></div>;
}
