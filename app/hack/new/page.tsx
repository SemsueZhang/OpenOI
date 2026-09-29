import { notFound } from 'next/navigation';
import { HackForm } from '@/components/forms';
import { Gate } from '@/components/gate';
import { getCurrentUser, getHack, getSolution } from '@/lib/data';
import { ConfigNotice } from '@/components/content';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default async function NewHackPage(props: { searchParams: Promise<{ solution_id?: string; edit?: string }> }) {
  const searchParams = await props.searchParams;
  if (!isSupabaseConfigured()) return <ConfigNotice/>;
  const { user } = await getCurrentUser();
  const solutionId = searchParams.solution_id;
  if (!solutionId || !(await getSolution(solutionId))) notFound();
  const hack = searchParams.edit ? await getHack(searchParams.edit) : null;
  if (searchParams.edit && (!hack || hack.solution_id !== solutionId)) notFound();
  if (!user || (hack && hack.author_id !== user.id)) return <Gate signedIn={!!user} returnPath={`/hack/new?solution_id=${solutionId}${hack ? `&edit=${hack.id}` : ''}`}/>;
  return <HackForm hack={hack ?? undefined} solutionId={solutionId}/>;
}
