import { Gate } from '@/components/gate';
import { ProfileForm } from '@/components/forms';
import { getCurrentUser } from '@/lib/data';
import { ConfigNotice } from '@/components/content';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default async function ProfileSettingsPage() {
  if (!isSupabaseConfigured()) return <ConfigNotice/>;
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) return <Gate signedIn={!!user} returnPath="/settings/profile"/>;
  return <ProfileForm profile={profile}/>;
}
