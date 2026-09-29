import { AuthForm } from '@/components/forms';
import { safeSitePath } from '@/lib/security';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { ConfigNotice } from '@/components/content';

export default function RegisterPage({ searchParams }: { searchParams: { next?: string } }) {
  return isSupabaseConfigured() ? <AuthForm mode="register" redirectTo={safeSitePath(searchParams.next)}/> : <div className="mx-auto max-w-md"><ConfigNotice/></div>;
}
