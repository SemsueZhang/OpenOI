import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/data';
import { I18nProvider } from '@/components/i18n';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import './globals.css';

export const metadata: Metadata = { title: 'OpenOI', description: '算法题解社区 · An open community for algorithm solutions' };
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await cookies()).get('openoi_locale')?.value === 'en' ? 'en' : 'zh';
  const { profile } = await getCurrentUser();
  return <html lang={locale}><body className="min-h-screen antialiased"><I18nProvider initialLocale={locale}><SiteHeader username={profile?.username} /><main className="min-h-[calc(100vh-8rem)] w-full px-4 py-8 sm:px-6 sm:py-10">{children}</main><SiteFooter/></I18nProvider></body></html>;
}
