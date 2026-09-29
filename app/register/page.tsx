import { AuthForm } from '@/components/forms';
import { safeSitePath } from '@/lib/security';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { ConfigNotice } from '@/components/content';

export default async function RegisterPage(props: { searchParams: Promise<{ next?: string }> }) {
  const searchParams = await props.searchParams;
  return isSupabaseConfigured() ? <AuthForm mode="register" redirectTo={safeSitePath(searchParams.next)}/> : <div className="mx-auto max-w-md"><ConfigNotice/></div>;
}
