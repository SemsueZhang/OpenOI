'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getLocale, LOCALE_COOKIE } from '@/lib/locale';
import { classifySignInFailure, EMAIL_NOT_CONFIRMED } from '@/lib/auth-flow';
import { cleanTags, httpUrlSchema, safeSitePath, usernameSchema, uuidSchema } from '@/lib/security';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ActionResult, TargetType } from '@/lib/types';

const messages = {
  zh: {
    config: '请先配置 Supabase 环境变量。', login: '请先登录。', invalid: '请检查表单内容。',
    permission: '没有权限执行此操作。', missing: '内容不存在。', duplicate: '该内容已存在。',
    failed: '提交失败，请稍后重试。', auth: '邮箱或密码不正确。', email: '请检查邮箱并完成验证。',
    username: '用户名须为 3–32 位小写字母、数字或下划线。', url: '仅支持 HTTP 或 HTTPS URL。',
    resent: '如果该邮箱有待验证账户，我们已重新发送确认邮件。', rate: '请求过于频繁，请稍后重试。',
    tags: '标签最多 12 个，每个不超过 32 字。', selfVote: '不能给自己的内容投票。'
  },
  en: {
    config: 'Configure the Supabase environment variables first.', login: 'Sign in to continue.', invalid: 'Check the form fields.',
    permission: 'You do not have permission to do that.', missing: 'Content was not found.', duplicate: 'This content already exists.',
    failed: 'Submission failed. Please try again.', auth: 'Incorrect email or password.', email: 'Check your email to confirm your account.',
    username: 'Username must be 3–32 lowercase letters, digits, or underscores.', url: 'Only HTTP or HTTPS URLs are supported.',
    resent: 'If this email has an unconfirmed account, we have sent another confirmation link.', rate: 'Too many requests. Please try again later.',
    tags: 'Use at most 12 tags, each no longer than 32 characters.', selfVote: 'You cannot vote on your own content.'
  }
} as const;
type MessageKey = keyof typeof messages.zh;
async function fail(key: MessageKey): Promise<ActionResult> { return { ok: false, error: messages[await getLocale()][key] }; }
function field(form: FormData, name: string): string { const value = form.get(name); return typeof value === 'string' ? value.trim() : ''; }
function fieldRaw(form: FormData, name: string): string { const value = form.get(name); return typeof value === 'string' ? value : ''; }
function nullable(value: string): string | null { return value || null; }
const markdown = (max: number) => z.string().max(max).refine((value) => value.trim().length > 0);
async function validationError(error: z.ZodError): Promise<ActionResult> {
  const first = error.issues[0];
  if (first?.message === 'invalid_username') return fail('username');
  if (first?.path.includes('external_url') || first?.path.includes('avatar_url')) return fail('url');
  return fail('invalid');
}
async function dbError(error: { code?: string; message?: string } | null): Promise<ActionResult> {
  if (/own content|own target/i.test(error?.message ?? '')) return fail('selfVote');
  if (error?.code === '23505') return fail('duplicate');
  if (error?.code === 'P0002') return fail('missing');
  if (error?.code === '42501' || /permission|policy|not allowed/i.test(error?.message ?? '')) return fail('permission');
  return fail('failed');
}
async function context() {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return null;
  return { db, user: data.user };
}
function missingContext(): Promise<ActionResult> { return isSupabaseConfigured() ? fail('login') : fail('config'); }

const optionalUrl = z.union([z.literal(''), httpUrlSchema]).transform(nullable);
const problemSchema = z.object({
  title: z.string().min(1).max(200), source: z.string().max(100), external_url: optionalUrl,
  difficulty: z.enum(['easy', 'medium', 'hard']), statement_md: markdown(100000)
});
const solutionSchema = z.object({
  title: z.string().min(1).max(200), algorithm: z.string().max(200), content_md: markdown(100000),
  code: z.string().max(100000), language: z.string().max(80), time_complexity: z.string().max(100), space_complexity: z.string().max(100)
});
const hackSchema = z.object({
  type: z.enum(['counterexample', 'logic', 'complexity', 'boundary']), content_md: markdown(100000),
  input_data: z.string().max(30000), expected_output: z.string().max(30000), actual_output: z.string().max(30000)
});

function confirmationRedirect(next: string): string | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  try {
    const target = new URL(`/auth/confirm?next=${encodeURIComponent(safeSitePath(next))}`, siteUrl);
    return ['http:', 'https:'].includes(target.protocol) ? target.toString() : null;
  } catch { return null; }
}

export async function signUp(form: FormData): Promise<ActionResult> {
  const db = await createSupabaseServerClient();
  if (!db) return fail('config');
  const parsed = z.object({ email: z.string().email().max(320), password: z.string().min(8).max(128), username: usernameSchema }).safeParse({
    email: field(form, 'email'), password: fieldRaw(form, 'password'), username: field(form, 'username')
  });
  if (!parsed.success) return validationError(parsed.error);
  const { data: usernameMatch } = await db.from('profiles').select('id').eq('username', parsed.data.username).maybeSingle();
  if (usernameMatch) return fail('duplicate');
  const emailRedirectTo = confirmationRedirect(field(form, 'redirectTo'));
  if (!emailRedirectTo) return fail('config');
  const { error } = await db.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { username: parsed.data.username }, emailRedirectTo } });
  return error ? dbError(error) : { ok: true, message: messages[await getLocale()].email };
}

export async function resendConfirmation(form: FormData): Promise<ActionResult> {
  const db = await createSupabaseServerClient();
  if (!db) return fail('config');
  const parsed = z.string().email().max(320).safeParse(field(form, 'email'));
  if (!parsed.success) return fail('invalid');
  const emailRedirectTo = confirmationRedirect(field(form, 'redirectTo'));
  if (!emailRedirectTo) return fail('config');
  const { error } = await db.auth.resend({ type: 'signup', email: parsed.data, options: { emailRedirectTo } });
  if (error?.code === 'over_email_send_rate_limit' || error?.status === 429) return fail('rate');
  // Supabase may distinguish existing, missing and already confirmed accounts.
  // Treat those 4xx outcomes alike; report transport/server failures separately.
  if (error && (!error.status || error.status >= 500)) return fail('failed');
  return { ok: true, message: messages[await getLocale()].resent };
}

export async function signIn(form: FormData): Promise<ActionResult> {
  const db = await createSupabaseServerClient();
  if (!db) return fail('config');
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse({ email: field(form, 'email'), password: fieldRaw(form, 'password') });
  if (!parsed.success) return validationError(parsed.error);
  const { error } = await db.auth.signInWithPassword(parsed.data);
  if (error) return classifySignInFailure(error) === EMAIL_NOT_CONFIRMED ? { ok: false, error: EMAIL_NOT_CONFIRMED } : fail('auth');
  revalidatePath('/', 'layout');
  return { ok: true, redirectTo: safeSitePath(field(form, 'redirectTo')) };
}

export async function signOut(_form?: FormData): Promise<ActionResult> {
  const db = await createSupabaseServerClient();
  if (!db) return fail('config');
  const { error } = await db.auth.signOut();
  if (error) return dbError(error);
  revalidatePath('/', 'layout');
  return { ok: true, redirectTo: '/' };
}

export async function setLocale(form: FormData): Promise<ActionResult> {
  const locale = field(form, 'locale');
  if (locale !== 'zh' && locale !== 'en') return fail('invalid');
  (await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  revalidatePath('/', 'layout');
  return { ok: true, redirectTo: safeSitePath(field(form, 'redirectTo')) };
}

export async function saveProfile(form: FormData): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return missingContext();
  const parsed = z.object({ username: usernameSchema, avatar_url: optionalUrl }).safeParse({ username: field(form, 'username'), avatar_url: field(form, 'avatar_url') });
  if (!parsed.success) return validationError(parsed.error);
  const { error } = await ctx.db.from('profiles').update(parsed.data).eq('id', ctx.user.id);
  if (error) return dbError(error);
  revalidatePath('/', 'layout');
  revalidatePath('/settings/profile');
  return { ok: true, redirectTo: `/profile/${parsed.data.username}` };
}

export async function saveProblem(form: FormData): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return missingContext();
  const parsed = problemSchema.safeParse({ title: field(form, 'title'), source: field(form, 'source'), external_url: field(form, 'external_url'), difficulty: field(form, 'difficulty'), statement_md: fieldRaw(form, 'statement_md') });
  if (!parsed.success) return validationError(parsed.error);
  let tags: string[];
  try { tags = cleanTags(field(form, 'tags')); } catch { return fail('tags'); }
  const values = { ...parsed.data, tags };
  const id = field(form, 'id');
  if (id) {
    if (!uuidSchema.safeParse(id).success) return fail('invalid');
    const { data: existing } = await ctx.db.from('problems').select('created_by').eq('id', id).maybeSingle();
    if (!existing) return fail('missing');
    if (existing.created_by !== ctx.user.id) return fail('permission');
    const { error } = await ctx.db.from('problems').update(values).eq('id', id);
    if (error) return dbError(error);
  } else {
    const { data, error } = await ctx.db.from('problems').insert(values).select('id').single();
    if (error) return dbError(error);
    revalidatePath('/');
    return { ok: true, id: data.id, redirectTo: `/problems/${data.id}` };
  }
  revalidatePath('/');
  revalidatePath(`/problems/${id}`);
  return { ok: true, id, redirectTo: `/problems/${id}` };
}

export async function deleteProblem(form: FormData): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return missingContext();
  const id = field(form, 'id');
  if (!uuidSchema.safeParse(id).success) return fail('invalid');
  const { data: existing } = await ctx.db.from('problems').select('created_by').eq('id', id).maybeSingle();
  if (!existing) return fail('missing');
  if (existing.created_by !== ctx.user.id) return fail('permission');
  const { error } = await ctx.db.from('problems').delete().eq('id', id);
  if (error) return dbError(error);
  revalidatePath('/');
  revalidatePath(`/problems/${id}`);
  return { ok: true, redirectTo: '/' };
}

export async function saveSolution(form: FormData): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return missingContext();
  const parsed = solutionSchema.safeParse({ title: field(form, 'title'), algorithm: field(form, 'algorithm'), content_md: fieldRaw(form, 'content_md'), code: fieldRaw(form, 'code'), language: field(form, 'language'), time_complexity: field(form, 'time_complexity'), space_complexity: field(form, 'space_complexity') });
  if (!parsed.success) return validationError(parsed.error);
  const values = parsed.data;
  const id = field(form, 'id');
  if (id) {
    if (!uuidSchema.safeParse(id).success) return fail('invalid');
    const { data: existing } = await ctx.db.from('solutions').select('author_id,problem_id').eq('id', id).maybeSingle();
    if (!existing) return fail('missing');
    if (existing.author_id !== ctx.user.id) return fail('permission');
    const { error } = await ctx.db.from('solutions').update(values).eq('id', id);
    if (error) return dbError(error);
    revalidatePath(`/problems/${existing.problem_id}`);
  } else {
    const problem_id = field(form, 'problem_id');
    if (!uuidSchema.safeParse(problem_id).success) return fail('invalid');
    const { data, error } = await ctx.db.from('solutions').insert({ ...values, problem_id }).select('id').single();
    if (error) return dbError(error);
    revalidatePath(`/problems/${problem_id}`);
    return { ok: true, id: data.id, redirectTo: `/solutions/${data.id}` };
  }
  revalidatePath(`/solutions/${id}`);
  return { ok: true, id, redirectTo: `/solutions/${id}` };
}

export async function deleteSolution(form: FormData): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return missingContext();
  const id = field(form, 'id');
  if (!uuidSchema.safeParse(id).success) return fail('invalid');
  const { data: existing } = await ctx.db.from('solutions').select('author_id,problem_id').eq('id', id).maybeSingle();
  if (!existing) return fail('missing');
  if (existing.author_id !== ctx.user.id) return fail('permission');
  const { error } = await ctx.db.from('solutions').delete().eq('id', id);
  if (error) return dbError(error);
  revalidatePath(`/problems/${existing.problem_id}`);
  revalidatePath(`/solutions/${id}`);
  return { ok: true, redirectTo: `/problems/${existing.problem_id}` };
}

export async function saveHack(form: FormData): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return missingContext();
  const parsed = hackSchema.safeParse({ type: field(form, 'type'), content_md: fieldRaw(form, 'content_md'), input_data: fieldRaw(form, 'input_data'), expected_output: fieldRaw(form, 'expected_output'), actual_output: fieldRaw(form, 'actual_output') });
  if (!parsed.success) return validationError(parsed.error);
  const values = parsed.data;
  const id = field(form, 'id');
  if (id) {
    if (!uuidSchema.safeParse(id).success) return fail('invalid');
    const { data: existing } = await ctx.db.from('hacks').select('author_id,solution_id').eq('id', id).maybeSingle();
    if (!existing) return fail('missing');
    if (existing.author_id !== ctx.user.id) return fail('permission');
    const { error } = await ctx.db.from('hacks').update(values).eq('id', id);
    if (error) return dbError(error);
    revalidatePath(`/solutions/${existing.solution_id}`);
    return { ok: true, id, redirectTo: `/solutions/${existing.solution_id}?hack=${id}#hack-${id}` };
  }
  const solution_id = field(form, 'solution_id');
  if (!uuidSchema.safeParse(solution_id).success) return fail('invalid');
  const { data, error } = await ctx.db.rpc('create_hack', { p_solution_id: solution_id, p_type: values.type, p_content_md: values.content_md, p_input_data: values.input_data, p_expected_output: values.expected_output, p_actual_output: values.actual_output });
  if (error) return dbError(error);
  revalidatePath(`/solutions/${solution_id}`);
  return { ok: true, id: String(data), redirectTo: `/solutions/${solution_id}?hack=${data}#hack-${data}` };
}

export async function deleteHack(form: FormData): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return missingContext();
  const id = field(form, 'id');
  if (!uuidSchema.safeParse(id).success) return fail('invalid');
  const { data: existing } = await ctx.db.from('hacks').select('author_id,solution_id').eq('id', id).maybeSingle();
  if (!existing) return fail('missing');
  if (existing.author_id !== ctx.user.id) return fail('permission');
  const { error } = await ctx.db.rpc('delete_hack', { p_hack_id: id });
  if (error) return dbError(error);
  revalidatePath(`/solutions/${existing.solution_id}`);
  return { ok: true, redirectTo: `/solutions/${existing.solution_id}` };
}

export async function saveComment(form: FormData): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return missingContext();
  const parsed = z.object({ content_md: markdown(20000), target_type: z.enum(['solution', 'hack']), target_id: uuidSchema }).safeParse({
    content_md: fieldRaw(form, 'content_md'), target_type: field(form, 'target_type'), target_id: field(form, 'target_id')
  });
  if (!parsed.success) return validationError(parsed.error);
  const id = field(form, 'id');
  if (id) {
    if (!uuidSchema.safeParse(id).success) return fail('invalid');
    const { data: existing } = await ctx.db.from('comments').select('author_id,target_type,target_id').eq('id', id).maybeSingle();
    if (!existing) return fail('missing');
    if (existing.author_id !== ctx.user.id) return fail('permission');
    const { error } = await ctx.db.from('comments').update({ content_md: parsed.data.content_md }).eq('id', id);
    if (error) return dbError(error);
    revalidatePath(`/solutions/${existing.target_type === 'solution' ? existing.target_id : await solutionOfHack(ctx.db, existing.target_id)}`);
    return { ok: true, id };
  }
  const { data, error } = await ctx.db.from('comments').insert(parsed.data).select('id').single();
  if (error) return dbError(error);
  revalidatePath(`/solutions/${parsed.data.target_type === 'solution' ? parsed.data.target_id : await solutionOfHack(ctx.db, parsed.data.target_id)}`);
  return { ok: true, id: data.id };
}

export async function deleteComment(form: FormData): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return missingContext();
  const id = field(form, 'id');
  if (!uuidSchema.safeParse(id).success) return fail('invalid');
  const { data: existing } = await ctx.db.from('comments').select('author_id,target_type,target_id').eq('id', id).maybeSingle();
  if (!existing) return fail('missing');
  if (existing.author_id !== ctx.user.id) return fail('permission');
  const { error } = await ctx.db.from('comments').delete().eq('id', id);
  if (error) return dbError(error);
  revalidatePath(`/solutions/${existing.target_type === 'solution' ? existing.target_id : await solutionOfHack(ctx.db, existing.target_id)}`);
  return { ok: true };
}

async function solutionOfHack(db: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, hackId: string): Promise<string> {
  const { data } = await db.from('hacks').select('solution_id').eq('id', hackId).maybeSingle();
  return data?.solution_id ?? hackId;
}

export async function setVote(form: FormData): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return missingContext();
  const target_type = field(form, 'target_type') as TargetType;
  const target_id = field(form, 'target_id');
  const raw = field(form, 'value');
  if (!['solution', 'hack'].includes(target_type) || !uuidSchema.safeParse(target_id).success || !['', '1', '-1'].includes(raw) || (target_type === 'solution' && raw === '-1')) return fail('invalid');
  const { error } = await ctx.db.rpc('set_vote', { p_target_type: target_type, p_target_id: target_id, p_value: raw ? Number(raw) : null });
  if (error) return dbError(error);
  revalidatePath(`/solutions/${target_type === 'solution' ? target_id : await solutionOfHack(ctx.db, target_id)}`);
  return { ok: true };
}
