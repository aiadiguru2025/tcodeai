import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'TCodeAI - SAP Transaction Code Intelligence',
  description:
    'Find SAP transaction codes using natural language. Search for T-codes like ME21N, VA01, FB01 with plain English queries.',
  keywords: ['SAP', 'T-code', 'transaction code', 'ERP', 'search', 'ME21N', 'VA01', 'FB01'],
  authors: [{ name: 'TCodeAI' }],
  openGraph: {
    title: 'TCodeAI - SAP Transaction Code Intelligence',
    description: 'Find SAP transaction codes using natural language.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased flex min-h-screen flex-col`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
        >
          Skip to content
        </a>
        <Providers>
          {children}
          <footer className="border-t border-border/40 py-6 text-center text-sm text-muted-foreground">
            &copy; 2026 <span className="font-medium"><span className="text-primary">TCode</span>AI</span>
          </footer>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
