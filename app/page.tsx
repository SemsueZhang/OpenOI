import { HomeView } from '@/components/home-view';
import { getCurrentUser, getProblems } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { ProblemFilters } from '@/lib/types';

export default async function HomePage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams;
  const first = (value: string | string[] | undefined) => typeof value === 'string' ? value : Array.isArray(value) ? value[0] : '';
  const filters: ProblemFilters = { q: first(searchParams.q).slice(0, 120), tag: first(searchParams.tag).slice(0, 60), page: Math.max(1, Number.parseInt(first(searchParams.page), 10) || 1) };
  const [result, { user }] = await Promise.all([getProblems(filters), getCurrentUser()]);
  return <HomeView result={result} filters={filters} configured={isSupabaseConfigured()} signedIn={!!user}/>;
}
