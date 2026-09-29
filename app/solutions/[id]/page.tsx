import { notFound } from 'next/navigation';
import { SolutionView } from '@/components/detail-views';
import { getComments, getCurrentUser, getHacks, getProblem, getSolution, normalizePage } from '@/lib/data';
import { uuidSchema } from '@/lib/security';
import { ConfigNotice } from '@/components/content';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default async function SolutionPage(props: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const value = (key: string) => typeof searchParams[key] === 'string' ? searchParams[key] as string : undefined;
  const focusHack = value('hack');
  const selectedHackId = value('hackComments');
  if (!isSupabaseConfigured()) return <ConfigNotice/>;
  const [solution, { user }] = await Promise.all([getSolution(params.id), getCurrentUser()]);
  if (!solution) notFound();
  const [problem, hacks, comments] = await Promise.all([getProblem(solution.problem_id), getHacks(solution.id, normalizePage(Number(value('hackPage'))), focusHack), getComments('solution', solution.id, normalizePage(Number(value('commentPage'))))]);
  const selectedHack = hacks.items.find(hack => hack.id === selectedHackId);
  const hackComments = selectedHack && uuidSchema.safeParse(selectedHackId).success ? await getComments('hack', selectedHack.id, normalizePage(Number(value('hackCommentPage')))) : null;
  return <SolutionView solution={solution} problem={problem} hacks={hacks} comments={comments} hackComments={hackComments} selectedHackId={selectedHack?.id} currentUserId={user?.id}/>;
}
