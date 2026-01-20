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
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
