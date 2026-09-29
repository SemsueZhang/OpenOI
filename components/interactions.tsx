'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { deleteProblem, deleteSolution, deleteComment, saveComment } from '@/app/actions';
import { characterCount } from '@/lib/security';
import { useI18n, type TranslationKey } from '@/components/i18n';
import { AuthorLink, DateText, EmptyState } from '@/components/content';
import { Markdown } from '@/components/markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ActionResult, Comment, Paged } from '@/lib/types';

export function DeleteButton({ kind, id, nextHref }: { kind: 'problem' | 'solution' | 'comment'; id: string; nextHref?: string }) {
  const { t } = useI18n(); const router = useRouter(); const lock = useRef(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const labels: Record<typeof kind, TranslationKey> = { problem: 'confirmDeleteProblem', solution: 'confirmDeleteSolution', comment: 'confirmDeleteComment' };
  const actions: Record<typeof kind, (data: FormData) => Promise<ActionResult>> = { problem: deleteProblem, solution: deleteSolution, comment: deleteComment };
  const remove = async () => { if (lock.current || !window.confirm(t(labels[kind]))) return; lock.current = true; setBusy(true); setError(''); const data = new FormData(); data.set('id', id); try { const result = await actions[kind](data); if (result.ok) { if (nextHref) router.push(nextHref); router.refresh(); } else setError(result.error); } catch { setError(t('formFailed')); } finally { setBusy(false); lock.current = false; } };
  return <span className="inline-flex flex-col"><Button type="button" size="sm" variant="danger" disabled={busy} onClick={remove}><Trash2 size={14}/>{t('delete')}</Button>{error && <span role="alert" className="text-xs text-rose-300">{error}</span>}</span>;
}

export function Comments({ targetId, result, currentUserId, solutionAuthorId, returnPath }: { targetId: string; result: Paged<Comment>; currentUserId?: string | null; solutionAuthorId?: string; returnPath: string }) {
  const { t } = useI18n(); const router = useRouter(); const lock = useRef(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [value, setValue] = useState(''); const count = characterCount(value);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (lock.current || !value.trim() || count > 100) return; lock.current = true; setBusy(true); setError(''); const data = new FormData(); data.set('target_type', 'solution'); data.set('target_id', targetId); data.set('content_md', value); try { const result = await saveComment(data); if (result.ok) { setValue(''); router.push(returnPath); router.refresh(); } else setError(result.error); } catch { setError(t('formFailed')); } finally { lock.current = false; setBusy(false); } };
  return <section className="space-y-4"><h3 className="text-lg font-semibold text-ink">{t('comments')} <span className="text-sm font-normal text-muted">{result.total}</span></h3>{result.items.length ? <div className="space-y-3">{result.items.map(comment => <CommentItem key={comment.id} comment={comment} currentUserId={currentUserId} solutionAuthorId={solutionAuthorId}/>)}</div> : <EmptyState title={t('emptyComments')}/>}{currentUserId ? <form onSubmit={submit} className="space-y-2"><Textarea aria-label={t('writeComment')} value={value} onChange={e => setValue(e.target.value)} rows={3} required placeholder={t('commentPlaceholder')} aria-invalid={count > 100}/><p className={`text-right text-xs ${count > 100 ? 'text-rose-300' : 'text-muted'}`}>{count} / 100</p>{error && <p role="alert" className="text-sm text-rose-300">{error}</p>}<Button type="submit" disabled={busy || !value.trim() || count > 100}>{busy ? t('submitting') : t('writeComment')}</Button></form> : <Link href={`/login?next=${encodeURIComponent(returnPath)}`} className="text-sm font-medium text-electric hover:underline">{t('signInRequired')}</Link>}</section>;
}
function CommentItem({ comment, currentUserId, solutionAuthorId }: { comment: Comment; currentUserId?: string | null; solutionAuthorId?: string }) {
  const { t } = useI18n(); const router = useRouter(); const [editing, setEditing] = useState(false); const [value, setValue] = useState(comment.content_md); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const lock = useRef(false); const count = characterCount(value);
  const save = async () => { if (lock.current || !value.trim() || count > 100) return; lock.current = true; setBusy(true); setError(''); const data = new FormData(); data.set('id', comment.id); data.set('target_type', 'solution'); data.set('target_id', comment.target_id); data.set('content_md', value); try { const result = await saveComment(data); if (result.ok) { setEditing(false); router.refresh(); } else setError(result.error); } catch { setError(t('formFailed')); } finally { lock.current = false; setBusy(false); } };
  return <article className="rounded-lg border border-edge bg-panel p-4"><div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted"><AuthorLink username={comment.author?.username}/>{solutionAuthorId && comment.author_id === solutionAuthorId && <span className="rounded bg-electric/10 px-1.5 py-0.5 font-medium text-electric">{t('authorReply')}</span>}<span>·</span><DateText value={comment.created_at}/></div>{editing ? <div className="space-y-2"><Textarea aria-label={t('edit')} rows={3} value={value} onChange={e => setValue(e.target.value)} aria-invalid={count > 100}/><p className={`text-right text-xs ${count > 100 ? 'text-rose-300' : 'text-muted'}`}>{count} / 100</p>{error && <p role="alert" className="text-xs text-rose-300">{error}</p>}<div className="flex gap-2"><Button size="sm" onClick={save} disabled={busy || !value.trim() || count > 100}>{busy ? t('saving') : t('save')}</Button><Button size="sm" variant="secondary" onClick={() => { setEditing(false); setValue(comment.content_md); }}>{t('cancel')}</Button></div></div> : <><Markdown className="prose-sm">{comment.content_md}</Markdown>{currentUserId === comment.author_id && <div className="mt-3 flex gap-2"><Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Pencil size={13}/>{t('edit')}</Button><DeleteButton kind="comment" id={comment.id}/></div>}</>}</article>;
}
