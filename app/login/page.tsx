import { AuthForm } from '@/components/forms';
import { safeSitePath } from '@/lib/security';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { ConfigNotice } from '@/components/content';

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return isSupabaseConfigured() ? <AuthForm mode="login" redirectTo={safeSitePath(searchParams.next)} confirmationError={searchParams.error === 'confirmation'}/> : <div className="mx-auto max-w-md"><ConfigNotice/></div>;
}
