'use client';

import Link from 'next/link';
import { UserRound } from 'lucide-react';
import type { Paged, Problem, Profile, Solution } from '@/lib/types';
import { ListPagination } from '@/components/list-pagination';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/components/i18n';
import { DateText, EmptyState, ProblemCard, SolutionCard } from '@/components/content';

function Avatar({ src }: { src: string }) { // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-full w-full object-cover"/>; }
export function ProfileView({ profile, problems, solutions, isSelf }: { profile: Profile; problems: Paged<Problem>; solutions: Paged<Solution>; isSelf: boolean }) {
  const { t } = useI18n(); const query = Object.fromEntries(useSearchParams().entries()); const pathname = `/profile/${encodeURIComponent(profile.username)}`; const avatar = profile.avatar_url && /^https?:\/\//i.test(profile.avatar_url) ? profile.avatar_url : null;
  return <div className="space-y-9"><header className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-edge bg-panel p-6"><div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-electric/15 text-electric">{avatar ? <Avatar src={avatar}/> : <UserRound size={28}/>}</div><div><h1 className="text-2xl font-bold text-ink">@{profile.username}</h1><p className="mt-1 text-sm text-muted">{t('memberSince')} <DateText value={profile.created_at}/></p></div></div>{isSelf && <Link href="/settings/profile" className="inline-flex h-9 items-center rounded-lg border border-edge px-3 text-sm font-medium hover:border-electric">{t('settings')}</Link>}</header><section id="profile-problems" className="scroll-mt-20"><h2 className="mb-4 text-xl font-semibold text-ink">{t('authoredProblems')} <span className="text-sm font-normal text-muted">{problems.total}</span></h2>{problems.items.length ? <div className="grid gap-3 sm:grid-cols-2">{problems.items.map(problem => <ProblemCard key={problem.id} problem={problem}/>)}</div> : <EmptyState title={t('emptyProblems')}/>}<ListPagination result={problems} pathname={pathname} query={query} pageKey="problemPage" anchor="profile-problems"/></section><section id="profile-solutions" className="scroll-mt-20"><h2 className="mb-4 text-xl font-semibold text-ink">{t('authoredSolutions')} <span className="text-sm font-normal text-muted">{solutions.total}</span></h2>{solutions.items.length ? <div className="grid gap-3 sm:grid-cols-2">{solutions.items.map(solution => <SolutionCard key={solution.id} solution={solution}/>)}</div> : <EmptyState title={t('emptySolutions')}/>}<ListPagination result={solutions} pathname={pathname} query={query} pageKey="solutionPage" anchor="profile-solutions"/></section></div>;
}
