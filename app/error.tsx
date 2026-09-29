'use client';
import { useI18n } from '@/components/i18n';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { const { t } = useI18n(); return <div className="mx-auto max-w-lg rounded-xl border border-edge bg-panel p-10 text-center"><h1 className="text-xl font-semibold text-ink">{t('errorTitle')}</h1><Button onClick={reset} className="mt-5">{t('retry')}</Button></div>; }
