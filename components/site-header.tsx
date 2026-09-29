'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Code2, Globe2, LogOut, Menu, Plus, UserRound } from 'lucide-react';
import { signOut } from '@/app/actions';
import { useI18n } from '@/components/i18n';
import { Button } from '@/components/ui/button';

export function SiteHeader({ username }: { username?: string | null }) {
  const { locale, t, changeLocale } = useI18n();
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnPath = `${pathname}${query ? `?${query}` : ''}`;
  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(returnPath)}`;
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const onLogout = async () => { if (busy) return; setBusy(true); const result = await signOut(new FormData()); setBusy(false); if (result.ok) router.refresh(); };
  return <header className="relative z-30 border-b border-edge/80 bg-void/85 backdrop-blur-xl after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-electric/40 after:to-transparent">
    <div className="mx-auto flex min-h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
      <div className="flex items-center gap-8"><Link href="/" className="group flex items-center gap-2.5 font-mono text-lg font-bold tracking-tight text-ink"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-electric/40 bg-electric/10 text-electric shadow-[0_0_18px_rgba(83,173,255,.16)] transition group-hover:border-violet/70 group-hover:text-violet"><Code2 size={18} strokeWidth={2.3} /></span><span>Open<span className="text-electric">OI</span><span className="ml-0.5 text-violet">_</span></span></Link>
        <nav className="hidden items-center gap-1 sm:flex"><Link href="/" className={`relative rounded-md px-3 py-2 font-mono text-xs font-medium tracking-wide transition-colors ${pathname === '/' ? 'text-electric after:absolute after:inset-x-3 after:-bottom-3 after:h-px after:bg-electric after:shadow-[0_0_10px_#53adff]' : 'text-muted hover:bg-panel-elevated hover:text-ink'}`}>{t('problems')}</Link></nav>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <button type="button" onClick={() => changeLocale(locale === 'zh' ? 'en' : 'zh')} className="flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted hover:bg-panel-elevated" aria-label={t('language')}><Globe2 size={16}/>{locale === 'zh' ? 'EN' : '中文'}</button>
        {username ? <><Link href="/new/problem" className="inline-flex h-9 items-center gap-1 rounded-lg btn-electric px-3 text-sm font-medium text-white "><Plus size={16}/>{t('newProblem')}</Link><Link href={`/profile/${encodeURIComponent(username)}`} className="flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium text-ink hover:bg-panel-elevated"><UserRound size={16}/>{username}</Link><button type="button" onClick={onLogout} disabled={busy} className="rounded-lg p-2 text-muted hover:bg-panel-elevated" title={t('logout')} aria-label={t('logout')}><LogOut size={17}/></button></> : <><Link href={loginHref} className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-panel-elevated">{t('login')}</Link><Link href={registerHref} className="rounded-lg btn-electric px-3 py-2 text-sm font-medium text-white ">{t('register')}</Link></>}
      </div>
      <Button size="sm" variant="ghost" className="sm:hidden" aria-label={t('menu')} aria-expanded={open} onClick={() => setOpen(!open)}><Menu size={20}/></Button>
    </div>
    {open && <nav className="mx-auto flex max-w-[1200px] flex-col gap-1 border-t border-edge bg-panel/95 px-4 py-3 text-ink sm:hidden [&_a]:transition-colors [&_a]:hover:bg-panel-elevated [&_a]:hover:text-electric [&_button]:transition-colors [&_button]:hover:bg-panel-elevated [&_button]:hover:text-electric">
      <Link onClick={() => setOpen(false)} href="/" className="rounded-md px-3 py-2 text-sm">{t('problems')}</Link>
      {username ? <><Link onClick={() => setOpen(false)} href="/new/problem" className="rounded-md px-3 py-2 text-sm">{t('newProblem')}</Link><Link onClick={() => setOpen(false)} href={`/profile/${encodeURIComponent(username)}`} className="rounded-md px-3 py-2 text-sm">{t('profile')}</Link><Link onClick={() => setOpen(false)} href="/settings/profile" className="rounded-md px-3 py-2 text-sm">{t('settings')}</Link><button onClick={onLogout} className="rounded-md px-3 py-2 text-left text-sm">{t('logout')}</button></> : <><Link onClick={() => setOpen(false)} href={loginHref} className="rounded-md px-3 py-2 text-sm">{t('login')}</Link><Link onClick={() => setOpen(false)} href={registerHref} className="rounded-md px-3 py-2 text-sm">{t('register')}</Link></>}
      <button onClick={() => changeLocale(locale === 'zh' ? 'en' : 'zh')} className="rounded-md px-3 py-2 text-left text-sm">{locale === 'zh' ? 'English' : '中文'}</button>
    </nav>}
  </header>;
}
