import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/lib/context/LanguageContext';
import { ThemeProvider } from '@/lib/context/ThemeContext';
import { UserProvider } from '@/lib/context/UserContext';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Español 90 — Mastering Spanish in 90 Days',
  description: 'Comprehensible Input + Active Recall + AI Speaking Partner',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={`${inter.variable}`} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="antialiased selection:bg-emerald-500/30 selection:text-emerald-200 transition-colors duration-500"
      >
        <div className="bg-mesh" />
        <ThemeProvider>
          <UserProvider>
            <LanguageProvider>
              <div className="relative z-10">{children}</div>
            </LanguageProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
