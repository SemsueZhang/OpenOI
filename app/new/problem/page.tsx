import { notFound } from 'next/navigation';
import { ProblemForm } from '@/components/forms';
import { Gate } from '@/components/gate';
import { getCurrentUser, getProblem } from '@/lib/data';
import { ConfigNotice } from '@/components/content';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default async function NewProblemPage({ searchParams }: { searchParams: { edit?: string } }) {
  if (!isSupabaseConfigured()) return <ConfigNotice/>;
  const { user } = await getCurrentUser();
  const problem = searchParams.edit ? await getProblem(searchParams.edit) : undefined;
  if (searchParams.edit && !problem) notFound();
  if (!user || (problem && problem.created_by !== user.id)) return <Gate signedIn={!!user} returnPath={problem ? `/new/problem?edit=${problem.id}` : '/new/problem'}/>;
  return <ProblemForm problem={problem || undefined}/>;
}
