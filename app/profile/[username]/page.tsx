import { notFound } from 'next/navigation';
import { ProfileView } from '@/components/profile-view';
import { getCurrentUser, getProfileByUsername, getUserContent } from '@/lib/data';
import { ConfigNotice } from '@/components/content';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default async function UserProfilePage(props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  if (!isSupabaseConfigured()) return <ConfigNotice/>;
  const [profile, { user }] = await Promise.all([getProfileByUsername(params.username), getCurrentUser()]);
  if (!profile) notFound();
  const content = await getUserContent(profile.id);
  return <ProfileView profile={profile} {...content} isSelf={user?.id === profile.id}/>;
}
