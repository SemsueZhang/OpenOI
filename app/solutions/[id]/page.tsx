import { notFound } from 'next/navigation';
import { SolutionView } from '@/components/detail-views';
import { getComments, getCurrentUser, getProblem, getSolution, normalizePage } from '@/lib/data';
import { ConfigNotice } from '@/components/content';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default async function SolutionPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ commentPage?: string }> }) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  if (!isSupabaseConfigured()) return <ConfigNotice/>;
  const [solution, { user }] = await Promise.all([getSolution(params.id), getCurrentUser()]);
  if (!solution) notFound();
  const [problem, comments] = await Promise.all([getProblem(solution.problem_id), getComments('solution', solution.id, normalizePage(Number(searchParams.commentPage)))]);
  return <SolutionView solution={solution} problem={problem} comments={comments} currentUserId={user?.id}/>;
}
