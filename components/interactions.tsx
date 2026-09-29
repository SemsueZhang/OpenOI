'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowBigDown, ArrowBigUp, Pencil, Trash2 } from 'lucide-react';
import { deleteProblem, deleteSolution, deleteHack, deleteComment, saveComment, setVote } from '@/app/actions';
import { useI18n, type TranslationKey } from '@/components/i18n';
import { AuthorLink, DateText, EmptyState } from '@/components/content';
import { Markdown } from '@/components/markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ActionResult, Comment, TargetType } from '@/lib/types';

type VoteButtonsProps = { type: TargetType; id: string; authorId: string; currentUserId?: string | null; myVote?: number | null; positive: number; negative?: number };

export function VoteButtons(props: VoteButtonsProps) {
  const { id, currentUserId, myVote = null, positive, negative } = props;
  const stateKey = `${id}:${currentUserId ?? ''}:${myVote ?? ''}:${positive}:${negative ?? 0}`;
  return <VoteButtonsStateful key={stateKey} {...props}/>;
}

function VoteButtonsStateful({ type, id, authorId, currentUserId, myVote = null, positive, negative }: VoteButtonsProps) {
  const { t } = useI18n(); const router = useRouter(); const lock = useRef(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [vote, setLocalVote] = useState(myVote); const [counts, setCounts] = useState({ positive, negative: negative ?? 0 });
  const mine = currentUserId === authorId; const disabled = !currentUserId || mine || busy;
  const apply = async (value: 1 | -1) => {
    if (disabled || lock.current) return; lock.current = true; setBusy(true); setError('');
    const next = vote === value ? null : value; const data = new FormData(); data.set('target_type', type); data.set('target_id', id); data.set('value', next === null ? '' : String(next));
    try { const result = await setVote(data); if (result.ok) { setCounts(old => ({ positive: old.positive + (vote === 1 ? -1 : 0) + (next === 1 ? 1 : 0), negative: old.negative + (vote === -1 ? -1 : 0) + (next === -1 ? 1 : 0) })); setLocalVote(next); router.refresh(); } else setError(result.error); }
    catch { setError(t('formFailed')); } finally { setBusy(false); lock.current = false; }
  };
  return <div><div className="flex flex-wrap items-center gap-2"><button type="button" title={!currentUserId ? t('signInToVote') : mine ? t('ownVote') : t(type === 'solution' ? 'useful' : 'validVote')} disabled={disabled} onClick={() => apply(1)} aria-pressed={vote === 1} className={`inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-medium ${vote === 1 ? 'border-electric bg-electric/10 text-electric' : 'border-edge bg-panel text-ink hover:border-electric'} disabled:cursor-not-allowed disabled:opacity-50`}><ArrowBigUp size={18}/>{type === 'solution' ? t('useful') : t('validVote')} {counts.positive}</button>{type === 'hack' && <button type="button" title={!currentUserId ? t('signInToVote') : mine ? t('ownVote') : t('invalidVote')} disabled={disabled} onClick={() => apply(-1)} aria-pressed={vote === -1} className={`inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-medium ${vote === -1 ? 'border-rose-400 bg-rose-500/10 text-rose-300' : 'border-edge bg-panel text-ink hover:border-rose-400'} disabled:cursor-not-allowed disabled:opacity-50`}><ArrowBigDown size={18}/>{t('invalidVote')} {counts.negative}</button>}</div>{error && <p role="alert" className="mt-2 text-xs text-rose-300">{error}</p>}{mine && <p className="mt-1 text-xs text-muted">{t('ownVote')}</p>}</div>;
}

export function DeleteButton({ kind, id, nextHref }: { kind: 'problem' | 'solution' | 'hack' | 'comment'; id: string; nextHref?: string }) {
  const { t } = useI18n(); const router = useRouter(); const lock = useRef(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const labels: Record<typeof kind, TranslationKey> = { problem: 'confirmDeleteProblem', solution: 'confirmDeleteSolution', hack: 'confirmDeleteHack', comment: 'confirmDeleteComment' };
  const actions: Record<typeof kind, (data: FormData) => Promise<ActionResult>> = { problem: deleteProblem, solution: deleteSolution, hack: deleteHack, comment: deleteComment };
  const remove = async () => { if (lock.current || !window.confirm(t(labels[kind]))) return; lock.current = true; setBusy(true); setError(''); const data = new FormData(); data.set('id', id); try { const result = await actions[kind](data); if (result.ok) { if (nextHref) router.push(nextHref); router.refresh(); } else setError(result.error); } catch { setError(t('formFailed')); } finally { setBusy(false); lock.current = false; } };
  return <span className="inline-flex flex-col"><Button type="button" size="sm" variant="danger" disabled={busy} onClick={remove}><Trash2 size={14}/>{t('delete')}</Button>{error && <span role="alert" className="text-xs text-rose-300">{error}</span>}</span>;
}

export function Comments({ targetType, targetId, items, currentUserId, solutionAuthorId, returnPath }: { targetType: TargetType; targetId: string; items: Comment[]; currentUserId?: string | null; solutionAuthorId?: string; returnPath: string }) {
  const { t } = useI18n(); const router = useRouter(); const lock = useRef(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [text, setText] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (lock.current || !text.trim()) return; lock.current = true; setBusy(true); setError(''); const data = new FormData(); data.set('target_type', targetType); data.set('target_id', targetId); data.set('content_md', text); try { const result = await saveComment(data); if (result.ok) { setText(''); router.refresh(); } else setError(result.error); } catch { setError(t('formFailed')); } finally { lock.current = false; setBusy(false); } };
  return <section className="space-y-4"><h3 className="text-lg font-semibold text-ink">{t('comments')} <span className="text-sm font-normal text-muted">{items.length}</span></h3>{items.length ? <div className="space-y-3">{items.map(comment => <CommentItem key={comment.id} comment={comment} currentUserId={currentUserId} solutionAuthorId={solutionAuthorId}/>)}</div> : <EmptyState title={t('emptyComments')}/>}{currentUserId ? <form onSubmit={submit} className="space-y-2"><Textarea aria-label={t('writeComment')} value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={10000} required placeholder={t('commentPlaceholder')}/>{error && <p role="alert" className="text-sm text-rose-300">{error}</p>}<Button type="submit" disabled={busy || !text.trim()}>{busy ? t('submitting') : t('writeComment')}</Button></form> : <Link href={`/login?next=${encodeURIComponent(returnPath)}`} className="text-sm font-medium text-electric hover:underline">{t('signInRequired')}</Link>}</section>;
}

function CommentItem({ comment, currentUserId, solutionAuthorId }: { comment: Comment; currentUserId?: string | null; solutionAuthorId?: string }) {
  const { t } = useI18n(); const router = useRouter(); const [editing, setEditing] = useState(false); const [value, setValue] = useState(comment.content_md); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const lock = useRef(false);
  const save = async () => { if (lock.current || !value.trim()) return; lock.current = true; setBusy(true); setError(''); const data = new FormData(); data.set('id', comment.id); data.set('target_type', comment.target_type); data.set('target_id', comment.target_id); data.set('content_md', value); try { const result = await saveComment(data); if (result.ok) { setEditing(false); router.refresh(); } else setError(result.error); } catch { setError(t('formFailed')); } finally { lock.current = false; setBusy(false); } };
  return <article className="rounded-lg border border-edge bg-panel p-4"><div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted"><AuthorLink username={comment.author?.username}/>{solutionAuthorId && comment.author_id === solutionAuthorId && <span className="rounded bg-electric/10 px-1.5 py-0.5 font-medium text-electric">{t('authorReply')}</span>}<span>·</span><DateText value={comment.created_at}/></div>{editing ? <div className="space-y-2"><Textarea aria-label={t('edit')} rows={4} value={value} onChange={e => setValue(e.target.value)}/>{error && <p role="alert" className="text-xs text-rose-300">{error}</p>}<div className="flex gap-2"><Button size="sm" onClick={save} disabled={busy || !value.trim()}>{busy ? t('saving') : t('save')}</Button><Button size="sm" variant="secondary" onClick={() => { setEditing(false); setValue(comment.content_md); }}>{t('cancel')}</Button></div></div> : <><Markdown className="prose-sm">{comment.content_md}</Markdown>{currentUserId === comment.author_id && <div className="mt-3 flex gap-2"><Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Pencil size={13}/>{t('edit')}</Button><DeleteButton kind="comment" id={comment.id}/></div>}</>}</article>;
}
