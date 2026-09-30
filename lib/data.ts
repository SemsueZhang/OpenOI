import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './supabase/server';
import type { Comment, Problem, ProblemFilters, Profile, Solution, TargetType, Paged } from './types';
import { uuidSchema } from './security';
import { PAGE_SIZE, normalizePage, pageRange } from './pagination';

export { normalizePage } from './pagination';
function emptyPage<T>(page: number): Paged<T> { return { items: [], page, total: 0, pages: 0 }; }
type RowWithAuthor = { author_id?: string; created_by?: string | null; author?: Profile | null };

async function attachAuthors<T extends RowWithAuthor>(db: SupabaseClient, rows: T[]): Promise<T[]> {
  const ids = [...new Set(rows.map((row) => row.author_id ?? row.created_by).filter((id): id is string => Boolean(id)))];
  if (!ids.length) return rows;
  const { data, error } = await db.from('profiles').select('*').in('id', ids);
  if (error) throw error;
  const profiles = new Map((data as Profile[]).map((profile) => [profile.id, profile]));
  return rows.map((row) => ({ ...row, author: profiles.get(row.author_id ?? row.created_by ?? '') ?? null }));
}

export async function getCurrentUser(): Promise<{ user: Awaited<ReturnType<SupabaseClient['auth']['getUser']>>['data']['user']; profile: Profile | null }> {
  const db = await createSupabaseServerClient();
  if (!db) return { user: null, profile: null };
  const { data } = await db.auth.getUser();
  if (!data.user) return { user: null, profile: null };
  const { data: profile } = await db.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  return { user: data.user, profile: (profile as Profile | null) ?? null };
}

export async function getProblems(filters: ProblemFilters = {}): Promise<Paged<Problem>> {
  const page = normalizePage(filters.page ?? 1);
  const db = await createSupabaseServerClient();
  if (!db) return { items: [], page, total: 0, pages: 0 };
  const filtered = (head = false) => {
    let query = db.from('problem_summaries').select('*', { count: 'exact', head });
    if (filters.q?.trim()) query = query.ilike('title', `%${filters.q.trim().replace(/[\\%_]/g, '\\$&')}%`);
    if (filters.tag?.trim()) query = query.contains('tags', [filters.tag.trim()]);
    return query;
  };
  const { data, count, error } = await filtered().order('created_at', { ascending: false }).order('id', { ascending: false }).range(...pageRange(page));
  if (error?.code === 'PGRST103' && page > 1) {
    const { count: total, error: countError } = await filtered(true);
    if (countError) throw countError;
    return total ? getProblems({ ...filters, page: Math.ceil(total / PAGE_SIZE) }) : emptyPage(1);
  }
  if (error) throw error;
  if (!count && page > 1) return emptyPage(1);
  if (!data?.length && count && page > Math.ceil(count / PAGE_SIZE)) return getProblems({ ...filters, page: Math.ceil(count / PAGE_SIZE) });
  return { items: await attachAuthors(db, (data ?? []) as Problem[]), page, total: count ?? 0, pages: Math.ceil((count ?? 0) / PAGE_SIZE) };
}

export async function getProblem(id: string): Promise<Problem | null> {
  if (!uuidSchema.safeParse(id).success) return null;
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.from('problem_summaries').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? (await attachAuthors(db, [data as Problem]))[0] : null;
}

export async function getSolutions(problemId: string, requestedPage = 1): Promise<Paged<Solution>> {
  const page = normalizePage(requestedPage);
  if (!uuidSchema.safeParse(problemId).success) return emptyPage(page);
  const db = await createSupabaseServerClient();
  if (!db) return emptyPage(page);
  const { data, count, error } = await db.from('solution_summaries').select('*', { count: 'exact' }).eq('problem_id', problemId).order('created_at', { ascending: false }).order('id', { ascending: false }).range(...pageRange(page));
  if (error?.code === 'PGRST103' && page > 1) {
    const { count: total, error: countError } = await db.from('solution_summaries').select('id', { count: 'exact', head: true }).eq('problem_id', problemId);
    if (countError) throw countError;
    return total ? getSolutions(problemId, Math.ceil(total / PAGE_SIZE)) : emptyPage(1);
  }
  if (error) throw error;
  if (!count && page > 1) return emptyPage(1);
  if (!data?.length && count && page > Math.ceil(count / PAGE_SIZE)) return getSolutions(problemId, Math.ceil(count / PAGE_SIZE));
  return { items: await attachAuthors(db, (data ?? []) as Solution[]), page, total: count ?? 0, pages: Math.ceil((count ?? 0) / PAGE_SIZE) };
}

export async function getSolution(id: string): Promise<Solution | null> {
  if (!uuidSchema.safeParse(id).success) return null;
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.from('solution_summaries').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? (await attachAuthors(db, [data as Solution]))[0] : null;
}

export async function getComments(targetType: TargetType, targetId: string, requestedPage = 1): Promise<Paged<Comment>> {
  const page = normalizePage(requestedPage);
  if (!uuidSchema.safeParse(targetId).success || targetType !== 'solution') return emptyPage(page);
  const db = await createSupabaseServerClient();
  if (!db) return emptyPage(page);
  const { data, count, error } = await db.from('comments').select('*', { count: 'exact' }).eq('target_type', targetType).eq('target_id', targetId).order('created_at', { ascending: false }).order('id', { ascending: false }).range(...pageRange(page));
  if (error?.code === 'PGRST103' && page > 1) {
    const { count: total, error: countError } = await db.from('comments').select('id', { count: 'exact', head: true }).eq('target_type', targetType).eq('target_id', targetId);
    if (countError) throw countError;
    return total ? getComments(targetType, targetId, Math.ceil(total / PAGE_SIZE)) : emptyPage(1);
  }
  if (error) throw error;
  if (!count && page > 1) return emptyPage(1);
  if (!data?.length && count && page > Math.ceil(count / PAGE_SIZE)) return getComments(targetType, targetId, Math.ceil(count / PAGE_SIZE));
  return { items: await attachAuthors(db, (data ?? []) as Comment[]), page, total: count ?? 0, pages: Math.ceil((count ?? 0) / PAGE_SIZE) };
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.from('profiles').select('*').eq('username', username).maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function getUserContent(userId: string, requestedPages: { problems: number; solutions: number }): Promise<{ problems: Paged<Problem>; solutions: Paged<Solution> }> {
  const pages = { problems: normalizePage(requestedPages.problems), solutions: normalizePage(requestedPages.solutions) };
  const db = await createSupabaseServerClient();
  if (!db) return { problems: emptyPage(pages.problems), solutions: emptyPage(pages.solutions) };
  const [problems, solutions] = await Promise.all([
    db.from('problem_summaries').select('*', { count: 'exact' }).eq('created_by', userId).order('created_at', { ascending: false }).order('id', { ascending: false }).range(...pageRange(pages.problems)),
    db.from('solution_summaries').select('*', { count: 'exact' }).eq('author_id', userId).order('created_at', { ascending: false }).order('id', { ascending: false }).range(...pageRange(pages.solutions))
  ]);
  if ([problems, solutions].some(result => result.error?.code === 'PGRST103')) {
    const counts = await Promise.all([
      db.from('problem_summaries').select('id', { count: 'exact', head: true }).eq('created_by', userId),
      db.from('solution_summaries').select('id', { count: 'exact', head: true }).eq('author_id', userId)
    ]);
    for (const result of counts) if (result.error) throw result.error;
    const corrected = {
      problems: Math.min(pages.problems, Math.max(1, Math.ceil((counts[0].count ?? 0) / PAGE_SIZE))),
      solutions: Math.min(pages.solutions, Math.max(1, Math.ceil((counts[1].count ?? 0) / PAGE_SIZE)))
    };
    if (corrected.problems !== pages.problems || corrected.solutions !== pages.solutions) return getUserContent(userId, corrected);
  }
  for (const result of [problems, solutions]) if (result.error) throw result.error;
  const corrected = {
    problems: Math.min(pages.problems, Math.max(1, Math.ceil((problems.count ?? 0) / PAGE_SIZE))),
    solutions: Math.min(pages.solutions, Math.max(1, Math.ceil((solutions.count ?? 0) / PAGE_SIZE)))
  };
  if (corrected.problems !== pages.problems || corrected.solutions !== pages.solutions) return getUserContent(userId, corrected);
  return {
    problems: { items: await attachAuthors(db, (problems.data ?? []) as Problem[]), page: pages.problems, total: problems.count ?? 0, pages: Math.ceil((problems.count ?? 0) / PAGE_SIZE) },
    solutions: { items: await attachAuthors(db, (solutions.data ?? []) as Solution[]), page: pages.solutions, total: solutions.count ?? 0, pages: Math.ceil((solutions.count ?? 0) / PAGE_SIZE) }
  };
}
