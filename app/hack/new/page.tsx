import { notFound } from 'next/navigation';
import { HackForm } from '@/components/forms';
import { Gate } from '@/components/gate';
import { getCurrentUser, getHacks, getSolution } from '@/lib/data';
import { ConfigNotice } from '@/components/content';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default async function NewHackPage({ searchParams }: { searchParams: { solution_id?: string; edit?: string } }) {
  if (!isSupabaseConfigured()) return <ConfigNotice/>;
  const { user } = await getCurrentUser();
  const solutionId = searchParams.solution_id;
  if (!solutionId || !(await getSolution(solutionId))) notFound();
  const hack = searchParams.edit ? (await getHacks(solutionId)).find(item => item.id === searchParams.edit) : undefined;
  if (searchParams.edit && !hack) notFound();
  if (!user || (hack && hack.author_id !== user.id)) return <Gate signedIn={!!user} returnPath={`/hack/new?solution_id=${solutionId}${hack ? `&edit=${hack.id}` : ''}`}/>;
  return <HackForm hack={hack} solutionId={solutionId}/>;
}
