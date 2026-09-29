import { notFound } from 'next/navigation';
import { ProblemView } from '@/components/detail-views';
import { getCurrentUser, getProblem, getSolutions } from '@/lib/data';
import { ConfigNotice } from '@/components/content';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default async function ProblemPage({ params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) return <ConfigNotice/>;
  const [problem, { user }] = await Promise.all([getProblem(params.id), getCurrentUser()]);
  if (!problem) notFound();
  const solutions = await getSolutions(problem.id);
  return <ProblemView problem={problem} solutions={solutions} currentUserId={user?.id}/>;
}
