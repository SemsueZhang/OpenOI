import { notFound } from 'next/navigation';
import { ProblemView } from '@/components/detail-views';
import { getCurrentUser, getProblem, getSolutions, normalizePage } from '@/lib/data';
import { ConfigNotice } from '@/components/content';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default async function ProblemPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ solutionPage?: string }> }) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  if (!isSupabaseConfigured()) return <ConfigNotice/>;
  const [problem, { user }] = await Promise.all([getProblem(params.id), getCurrentUser()]);
  if (!problem) notFound();
  const solutions = await getSolutions(problem.id, normalizePage(Number(searchParams.solutionPage)));
  return <ProblemView problem={problem} solutions={solutions} currentUserId={user?.id}/>;
}
