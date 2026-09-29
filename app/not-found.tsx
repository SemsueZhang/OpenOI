'use client';
import Link from 'next/link';
import { useI18n } from '@/components/i18n';
export default function NotFound() { const { t } = useI18n(); return <div className="mx-auto max-w-lg py-20 text-center"><div className="text-6xl font-bold text-electric">404</div><h1 className="mt-5 text-2xl font-semibold text-ink">{t('notFoundTitle')}</h1><p className="mt-3 text-sm text-muted">{t('notFoundText')}</p><Link href="/" className="mt-6 inline-flex rounded-lg btn-electric px-4 py-2 text-sm font-medium text-white ">{t('goHome')}</Link></div>; }
