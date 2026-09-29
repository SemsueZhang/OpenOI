import { notFound } from 'next/navigation';
import { SolutionForm } from '@/components/forms';
import { Gate } from '@/components/gate';
import { getCurrentUser, getProblem, getSolution } from '@/lib/data';
import { ConfigNotice } from '@/components/content';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default async function NewSolutionPage({ searchParams }: { searchParams: { problem_id?: string; edit?: string } }) {
  if (!isSupabaseConfigured()) return <ConfigNotice/>;
  const { user } = await getCurrentUser();
  const solution = searchParams.edit ? await getSolution(searchParams.edit) : undefined;
  if (searchParams.edit && !solution) notFound();
  const problemId = solution?.problem_id || searchParams.problem_id;
  if (!problemId || !(await getProblem(problemId))) notFound();
  if (!user || (solution && solution.author_id !== user.id)) return <Gate signedIn={!!user} returnPath={`/new/solution?problem_id=${problemId}${solution ? `&edit=${solution.id}` : ''}`}/>;
  return <SolutionForm solution={solution || undefined} problemId={problemId}/>;
}
