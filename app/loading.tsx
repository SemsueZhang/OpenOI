'use client';
import { useI18n } from '@/components/i18n';
export default function Loading() { const { t } = useI18n(); return <div className="animate-pulse space-y-5" role="status" aria-label={t('loading')}><div className="h-9 w-1/2 rounded-lg bg-panel-elevated"/><div className="h-24 rounded-xl bg-panel-elevated"/><div className="h-36 rounded-xl bg-panel-elevated"/><div className="h-36 rounded-xl bg-panel-elevated"/></div>; }
