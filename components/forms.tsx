'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Markdown } from '@/components/markdown';
import { EMAIL_NOT_CONFIRMED, showConfirmationResend } from '@/lib/auth-flow';
import { PROBLEM_TAGS, characterCount } from '@/lib/security';
import { useI18n } from '@/components/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { saveProblem, saveSolution, saveProfile, signIn, signUp, resendConfirmation } from '@/app/actions';
import type { ActionResult, Problem, Profile, Solution } from '@/lib/types';

type Action = (data: FormData) => Promise<ActionResult>;
function useSubmit() {
  const router = useRouter(); const { t } = useI18n(); const lock = useRef(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>, action: Action, next: (result: Extract<ActionResult, { ok: true }>) => void) => {
    event.preventDefault(); if (lock.current) return;
    const overflow = Array.from(event.currentTarget.querySelectorAll<HTMLTextAreaElement>('textarea[data-character-limit]')).find(input => characterCount(input.value) > Number(input.dataset.characterLimit));
    if (overflow) { setError(t('characterLimitExceeded')); overflow.focus(); return; }
    lock.current = true; setBusy(true); setError(''); setSuccess('');
    try { const result = await action(new FormData(event.currentTarget)); if (result.ok) { next(result); router.refresh(); } else setError(result.error); }
    catch { setError('formFailed'); }
    finally { lock.current = false; setBusy(false); }
  };
  return { busy, error, setError, success, setSuccess, submit, router };
}
function Feedback({ error, success }: { error: string; success?: string }) {
  const { t } = useI18n();
  return <>{error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error === 'formFailed' ? t('formFailed') : error === EMAIL_NOT_CONFIRMED ? t('emailNotConfirmed') : error}</p>}{success && <p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">{success}</p>}</>;
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="block space-y-1.5"><span className="text-sm font-medium text-ink">{label}</span>{children}{hint && <span className="block text-xs text-muted">{hint}</span>}</label>; }
export function MarkdownEditor({ name, label, initial = '', required = false, rows = 12, limit }: { name: string; label: string; initial?: string; required?: boolean; rows?: number; limit?: number }) {
  const { t } = useI18n(); const [value, setValue] = useState(initial); const [preview, setPreview] = useState(false);
  const count = characterCount(value); const over = limit !== undefined && count > limit;
  return <div><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor={name} className="text-sm font-medium text-ink">{label}</label><div className="flex rounded-lg border border-edge bg-panel-elevated p-0.5 text-xs"><button type="button" onClick={() => setPreview(false)} className={`rounded-md px-3 py-1.5 ${!preview ? 'bg-panel font-medium text-ink shadow-sm' : 'text-muted'}`}>{t('write')}</button><button type="button" onClick={() => setPreview(true)} className={`rounded-md px-3 py-1.5 ${preview ? 'bg-panel font-medium text-ink shadow-sm' : 'text-muted'}`}>{t('preview')}</button></div></div><Textarea id={name} name={name} required={required} rows={rows} value={value} onChange={e => setValue(e.target.value)} aria-invalid={over} aria-describedby={limit ? `${name}-count` : undefined} data-character-limit={limit} className={preview ? 'sr-only' : 'font-mono text-[13px]'} /><div className={preview ? 'min-h-44 rounded-lg border border-edge bg-panel p-4' : 'hidden'}>{value ? <Markdown>{value}</Markdown> : <p className="text-sm text-muted">{t('previewEmpty')}</p>}</div><div id={`${name}-count`} className={`mt-1 flex justify-between text-xs ${over ? 'text-rose-300' : 'text-muted'}`}><span>{t('markdownHint')}</span>{limit && <span role={over ? 'alert' : undefined}>{count} / {limit}</span>}</div></div>;
}
function UrlListField({ name, label, initial, hint }: { name: string; label: string; initial?: string[]; hint: string }) {
  return <Field label={label} hint={hint}><Textarea name={name} rows={3} defaultValue={initial?.join('\n') || ''} placeholder="https://…" className="font-mono text-xs"/></Field>;
}
export function ProblemForm({ problem }: { problem?: Problem }) {
  const { t } = useI18n(); const state = useSubmit(); const [tags, setTags] = useState<string[]>(problem?.tags || []);
  const toggleTag = (tag: string) => setTags(current => current.includes(tag) ? current.filter(value => value !== tag) : [...current, tag]);
  return <form onSubmit={e => state.submit(e, saveProblem, result => state.router.push(result.redirectTo || `/problems/${result.id || problem?.id}`))} className="mx-auto max-w-3xl space-y-6 rounded-xl border border-edge bg-panel p-5 sm:p-8"><h1 className="text-2xl font-bold text-ink">{t(problem ? 'editProblemTitle' : 'newProblemTitle')}</h1><fieldset disabled={state.busy} className="space-y-5">{problem && <input type="hidden" name="id" value={problem.id}/>}<Field label={t('title')}><Input name="title" required maxLength={200} defaultValue={problem?.title || ''} placeholder={t('titlePlaceholder')}/></Field><div><span className="text-sm font-medium text-ink">{t('tags')}</span><div className="mt-2 flex flex-wrap gap-2">{PROBLEM_TAGS.map(tag => <label key={tag} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${tags.includes(tag) ? 'border-electric bg-electric/15 text-electric' : 'border-edge bg-panel-elevated text-muted hover:border-electric/50'}`}><input type="checkbox" className="sr-only" checked={tags.includes(tag)} onChange={() => toggleTag(tag)}/>{tag}</label>)}</div><input type="hidden" name="tags" value={tags.join(',')}/></div><MarkdownEditor name="statement_md" label={t('statementLabel')} initial={problem?.statement_md || ''} required limit={1000}/><UrlListField name="source_urls" label={t('sourceUrls')} initial={problem?.source_urls} hint={t('urlListHint')}/><UrlListField name="similar_urls" label={t('similarUrls')} initial={problem?.similar_urls} hint={t('urlListHint')}/><Feedback error={state.error}/><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => state.router.back()}>{t('cancel')}</Button><Button type="submit" disabled={state.busy}>{state.busy ? t('saving') : t('save')}</Button></div></fieldset></form>;
}
export function SolutionForm({ solution, problemId }: { solution?: Solution; problemId: string }) {
  const { t } = useI18n(); const state = useSubmit();
  return <form onSubmit={e => state.submit(e, saveSolution, result => state.router.push(result.redirectTo || `/solutions/${result.id || solution?.id}`))} className="mx-auto max-w-3xl space-y-6 rounded-xl border border-edge bg-panel p-5 sm:p-8"><h1 className="text-2xl font-bold text-ink">{t(solution ? 'editSolutionTitle' : 'newSolutionTitle')}</h1><fieldset disabled={state.busy} className="space-y-5"><input type="hidden" name="problem_id" value={problemId}/>{solution && <input type="hidden" name="id" value={solution.id}/>}<Field label={t('title')}><Input name="title" required maxLength={200} defaultValue={solution?.title || ''} placeholder={t('solutionTitlePlaceholder')}/></Field><MarkdownEditor name="content_md" label={t('contentLabel')} initial={solution?.content_md || ''} required limit={1000}/><Field label={t('originalUrl')}><Input name="original_url" type="url" required defaultValue={solution?.original_url || ''} placeholder="https://…"/></Field><Feedback error={state.error}/><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => state.router.back()}>{t('cancel')}</Button><Button type="submit" disabled={state.busy}>{state.busy ? t('saving') : t('save')}</Button></div></fieldset></form>;
}
export function AuthForm({ mode, redirectTo, confirmationError = false }: { mode: 'login' | 'register'; redirectTo: string; confirmationError?: boolean }) {
  const { t } = useI18n(); const state = useSubmit();
  const formRef = useRef<HTMLFormElement>(null); const resendLock = useRef(false); const [resendBusy, setResendBusy] = useState(false); const [resendError, setResendError] = useState(''); const [resendSuccess, setResendSuccess] = useState(false);
  const resend = async () => {
    if (resendLock.current) return;
    const email = formRef.current?.elements.namedItem('email') as HTMLInputElement | null;
    if (!email || !email.reportValidity()) return;
    resendLock.current = true; setResendBusy(true); setResendError(''); setResendSuccess(false);
    const data = new FormData(); data.set('email', email.value); data.set('redirectTo', redirectTo);
    try { const result = await resendConfirmation(data); if (result.ok) setResendSuccess(true); else setResendError(result.error); }
    catch { setResendError(t('formFailed')); }
    finally { resendLock.current = false; setResendBusy(false); }
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>) => state.submit(event, mode === 'login' ? signIn : signUp, result => { if (mode === 'register') state.setSuccess(result.message || t('checkEmail')); else state.router.push(result.redirectTo || '/'); });
  return <form ref={formRef} onSubmit={onSubmit} className="mx-auto max-w-md space-y-5 rounded-xl border border-edge bg-panel p-6 shadow-sm sm:p-8"><div><h1 className="text-2xl font-bold text-ink">{t(mode === 'login' ? 'loginTitle' : 'registerTitle')}</h1><p className="mt-2 text-sm text-muted">{t(mode === 'login' ? 'loginHint' : 'registerHint')}</p></div>{confirmationError && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-300">{t('confirmError')}</p>}<fieldset disabled={state.busy} className="space-y-4"><input type="hidden" name="redirectTo" value={redirectTo}/>{mode === 'register' && <Field label={t('username')} hint={t('userNameHint')}><Input name="username" autoComplete="username" pattern="[a-z0-9_]+" minLength={3} maxLength={32} required/></Field>}<Field label={t('email')}><Input name="email" type="email" autoComplete="email" required/></Field><Field label={t('password')}><Input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 8 : undefined} required/></Field><Feedback error={state.error} success={state.success}/><Button type="submit" className="w-full" disabled={state.busy}>{state.busy ? t('submitting') : t(mode === 'login' ? 'login' : 'register')}</Button>{showConfirmationResend(confirmationError, !!state.success, state.error) && <div className="space-y-2 border-t border-edge pt-4"><Button type="button" variant="secondary" className="w-full" onClick={resend} disabled={resendBusy}>{resendBusy ? t('submitting') : t('resendConfirmation')}</Button>{resendError && <p role="alert" className="text-sm text-rose-300">{resendError}</p>}{resendSuccess && <p role="status" className="text-sm text-electric">{t('resendSent')}</p>}</div>}</fieldset><p className="text-center text-sm text-muted">{t(mode === 'login' ? 'noAccount' : 'hasAccount')} <Link href={mode === 'login' ? `/register?next=${encodeURIComponent(redirectTo)}` : `/login?next=${encodeURIComponent(redirectTo)}`} className="font-medium text-electric hover:underline">{t(mode === 'login' ? 'register' : 'login')}</Link></p></form>;
}
export function ProfileForm({ profile }: { profile: Profile }) {
  const { t } = useI18n(); const state = useSubmit();
  return <form onSubmit={e => { void state.submit(e, saveProfile, result => state.router.push(result.redirectTo || `/profile/${encodeURIComponent(profile.username)}`)); }} className="mx-auto max-w-xl space-y-5 rounded-xl border border-edge bg-panel p-6 sm:p-8"><h1 className="text-2xl font-bold text-ink">{t('profileEditTitle')}</h1><fieldset disabled={state.busy} className="space-y-5"><Field label={t('username')} hint={t('userNameHint')}><Input name="username" required minLength={3} maxLength={32} pattern="[a-z0-9_]+" defaultValue={profile.username}/></Field><Field label={t('avatarUrl')}><Input name="avatar_url" type="url" defaultValue={profile.avatar_url || ''} placeholder="https://…"/></Field><Feedback error={state.error}/><Button type="submit" disabled={state.busy}>{state.busy ? t('saving') : t('save')}</Button></fieldset></form>;
}
