import { notFound } from 'next/navigation';
import { ProfileView } from '@/components/profile-view';
import { getCurrentUser, getProfileByUsername, getUserContent, normalizePage } from '@/lib/data';
import { ConfigNotice } from '@/components/content';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default async function UserProfilePage(props: { params: Promise<{ username: string }>; searchParams: Promise<{ problemPage?: string; solutionPage?: string; hackPage?: string }> }) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  if (!isSupabaseConfigured()) return <ConfigNotice/>;
  const [profile, { user }] = await Promise.all([getProfileByUsername(params.username), getCurrentUser()]);
  if (!profile) notFound();
  const content = await getUserContent(profile.id, { problems: normalizePage(Number(searchParams.problemPage)), solutions: normalizePage(Number(searchParams.solutionPage)), hacks: normalizePage(Number(searchParams.hackPage)) });
  return <ProfileView profile={profile} {...content} isSelf={user?.id === profile.id}/>;
}
