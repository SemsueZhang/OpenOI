import { notFound } from 'next/navigation';
import { SolutionView } from '@/components/detail-views';
import { getComments, getCurrentUser, getHacks, getProblem, getSolution } from '@/lib/data';
import { ConfigNotice } from '@/components/content';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default async function SolutionPage({ params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) return <ConfigNotice/>;
  const [solution, { user }] = await Promise.all([getSolution(params.id), getCurrentUser()]);
  if (!solution) notFound();
  const [problem, hacks, comments] = await Promise.all([getProblem(solution.problem_id), getHacks(solution.id), getComments('solution', solution.id)]);
  const allComments = await Promise.all(hacks.map(hack => getComments('hack', hack.id)));
  const hackComments = Object.fromEntries(hacks.map((hack, index) => [hack.id, allComments[index]]));
  return <SolutionView solution={solution} problem={problem} hacks={hacks} comments={comments} hackComments={hackComments} currentUserId={user?.id}/>;
}
