import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import 'animate.css';
import 'katex/dist/katex.min.css';
import { ThemeProvider } from '@/lib/hooks/use-theme';
import { I18nProvider } from '@/lib/hooks/use-i18n';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
// Disabled: causes webpack node: protocol issue
// import { ServerProvidersInit } from '@/components/server-providers-init';

const inter = localFont({
  src: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-sans',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'LearnAI.study - LearnAI School Platform',
  description:
    'Designed and operated by LearnAI.study. Multi-tenant AI school SaaS powered by LearnAI for adaptive classrooms, role-based workflows, and secure education operations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const enableServerProvidersInit =
    process.env.NEXT_PUBLIC_ENABLE_SERVER_PROVIDERS_INIT === 'true';

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              {/* Disabled: causes webpack node: protocol issue */}
              {/* {enableServerProvidersInit ? <ServerProvidersInit /> : null} */}
              {children}
              <div className="px-4 pb-3 text-center text-[11px] text-gray-500">
                Designed and operated by LearnAI.study
              </div>
              <Toaster position="top-center" />
              <Analytics />
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
