import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './supabase/server';
import type { Comment, Hack, Problem, ProblemFilters, Profile, Solution, TargetType, Paged } from './types';
import { uuidSchema } from './security';

const PAGE_SIZE = 20;
type RowWithAuthor = { author_id?: string; created_by?: string; author?: Profile | null };

async function attachAuthors<T extends RowWithAuthor>(db: SupabaseClient, rows: T[]): Promise<T[]> {
  const ids = [...new Set(rows.map((row) => row.author_id ?? row.created_by).filter((id): id is string => Boolean(id)))];
  if (!ids.length) return rows;
  const { data, error } = await db.from('profiles').select('*').in('id', ids);
  if (error) throw error;
  const profiles = new Map((data as Profile[]).map((profile) => [profile.id, profile]));
  return rows.map((row) => ({ ...row, author: profiles.get(row.author_id ?? row.created_by ?? '') ?? null }));
}

async function attachVotes<T extends { id: string; my_vote?: number | null }>(db: SupabaseClient, rows: T[], targetType: TargetType): Promise<T[]> {
  if (!rows.length) return rows;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return rows;
  const { data, error } = await db.from('votes').select('target_id,value').eq('user_id', auth.user.id).eq('target_type', targetType).in('target_id', rows.map((row) => row.id));
  if (error) throw error;
  const votes = new Map((data ?? []).map((vote) => [vote.target_id as string, vote.value as number]));
  return rows.map((row) => ({ ...row, my_vote: votes.get(row.id) ?? null }));
}

export async function getCurrentUser(): Promise<{ user: Awaited<ReturnType<SupabaseClient['auth']['getUser']>>['data']['user']; profile: Profile | null }> {
  const db = createSupabaseServerClient();
  if (!db) return { user: null, profile: null };
  const { data } = await db.auth.getUser();
  if (!data.user) return { user: null, profile: null };
  const { data: profile } = await db.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  return { user: data.user, profile: (profile as Profile | null) ?? null };
}

export async function getProblems(filters: ProblemFilters = {}): Promise<Paged<Problem>> {
  const page = Number.isSafeInteger(filters.page) && (filters.page ?? 0) > 0 ? filters.page! : 1;
  const db = createSupabaseServerClient();
  if (!db) return { items: [], page, total: 0, pages: 0 };
  let query = db.from('problem_summaries').select('*', { count: 'exact' });
  if (filters.q?.trim()) query = query.ilike('title', `%${filters.q.trim().replace(/[\\%_]/g, '\\$&')}%`);
  if (filters.source?.trim()) query = query.eq('source', filters.source.trim());
  if (['easy', 'medium', 'hard'].includes(filters.difficulty ?? '')) query = query.eq('difficulty', filters.difficulty!);
  if (filters.tag?.trim()) query = query.contains('tags', [filters.tag.trim()]);
  const { data, count, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw error;
  return { items: await attachAuthors(db, (data ?? []) as Problem[]), page, total: count ?? 0, pages: Math.ceil((count ?? 0) / PAGE_SIZE) };
}

export async function getProblem(id: string): Promise<Problem | null> {
  if (!uuidSchema.safeParse(id).success) return null;
  const db = createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.from('problem_summaries').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? (await attachAuthors(db, [data as Problem]))[0] : null;
}

export async function getSolutions(problemId: string): Promise<Solution[]> {
  if (!uuidSchema.safeParse(problemId).success) return [];
  const db = createSupabaseServerClient();
  if (!db) return [];
  const { data, error } = await db.from('solution_summaries').select('*').eq('problem_id', problemId).order('useful_votes', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false });
  if (error) throw error;
  return attachVotes(db, await attachAuthors(db, (data ?? []) as Solution[]), 'solution');
}

export async function getSolution(id: string): Promise<Solution | null> {
  if (!uuidSchema.safeParse(id).success) return null;
  const db = createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.from('solution_summaries').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? (await attachVotes(db, await attachAuthors(db, [data as Solution]), 'solution'))[0] : null;
}

export async function getHacks(solutionId: string): Promise<Hack[]> {
  if (!uuidSchema.safeParse(solutionId).success) return [];
  const db = createSupabaseServerClient();
  if (!db) return [];
  const { data, error } = await db.from('hack_summaries').select('*').eq('solution_id', solutionId).order('created_at', { ascending: false });
  if (error) throw error;
  return attachVotes(db, await attachAuthors(db, (data ?? []) as Hack[]), 'hack');
}

export async function getComments(targetType: TargetType, targetId: string): Promise<Comment[]> {
  if (!uuidSchema.safeParse(targetId).success || !['solution', 'hack'].includes(targetType)) return [];
  const db = createSupabaseServerClient();
  if (!db) return [];
  const { data, error } = await db.from('comments').select('*').eq('target_type', targetType).eq('target_id', targetId).order('created_at', { ascending: true });
  if (error) throw error;
  return attachAuthors(db, (data ?? []) as Comment[]);
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const db = createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.from('profiles').select('*').eq('username', username).maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function getUserContent(userId: string): Promise<{ problems: Problem[]; solutions: Solution[]; hacks: Hack[] }> {
  const db = createSupabaseServerClient();
  if (!db) return { problems: [], solutions: [], hacks: [] };
  const [problems, solutions, hacks] = await Promise.all([
    db.from('problem_summaries').select('*').eq('created_by', userId).order('created_at', { ascending: false }),
    db.from('solution_summaries').select('*').eq('author_id', userId).order('created_at', { ascending: false }),
    db.from('hack_summaries').select('*').eq('author_id', userId).order('created_at', { ascending: false })
  ]);
  for (const result of [problems, solutions, hacks]) if (result.error) throw result.error;
  return {
    problems: await attachAuthors(db, (problems.data ?? []) as Problem[]),
    solutions: await attachAuthors(db, (solutions.data ?? []) as Solution[]),
    hacks: await attachAuthors(db, (hacks.data ?? []) as Hack[])
  };
}
