'use client';
import { useI18n } from '@/components/i18n';
export function SiteFooter() { const { t } = useI18n(); return <footer className="border-t border-edge bg-panel"><div className="flex w-full items-center justify-between gap-4 px-4 py-5 text-xs text-muted sm:px-6"><span>© {new Date().getFullYear()} OpenOI</span><span>{t('footerTagline')}</span></div></footer>; }
