'use client';
import Link from 'next/link';
import { useI18n } from '@/components/i18n';
export function Gate({ signedIn, returnPath = '/' }: { signedIn: boolean; returnPath?: string }) { const { t } = useI18n(); return <div className="mx-auto max-w-xl rounded-xl border border-edge bg-panel p-10 text-center"><h1 className="text-xl font-semibold text-ink">{signedIn ? t('noPermission') : t('signInRequired')}</h1>{!signedIn && <Link href={`/login?next=${encodeURIComponent(returnPath)}`} className="mt-5 inline-flex rounded-lg btn-electric px-4 py-2 text-sm font-medium text-white">{t('login')}</Link>}</div>; }
