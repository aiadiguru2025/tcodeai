import { UnifiedSearchBar } from '@/components/search/UnifiedSearchBar';
import { Header } from '@/components/layout/Header';
import prisma from '@/lib/db';

const FALLBACK_SEARCHES = [
  { label: 'ME21N', type: 'tcode' as const },
  { label: 'Create purchase order', type: 'ai' as const },
  { label: 'VA01', type: 'tcode' as const },
  { label: 'Post goods receipt', type: 'ai' as const },
  { label: 'Display vendor invoices', type: 'ai' as const },
  { label: 'FB01', type: 'tcode' as const },
];

async function getPopularTCodes() {
  try {
    const popular = await prisma.searchLog.groupBy({
      by: ['selectedTcodeId'],
      where: { selectedTcodeId: { not: null } },
      _count: { selectedTcodeId: true },
      orderBy: { _count: { selectedTcodeId: 'desc' } },
      take: 8,
    });

    if (popular.length < 3) return null;

    const tcodeIds = popular.map((p) => p.selectedTcodeId!);
    const tcodes = await prisma.transactionCode.findMany({
      where: { id: { in: tcodeIds } },
      select: { id: true, tcode: true },
    });

    const tcodeMap = new Map(tcodes.map((t) => [t.id, t]));

    return popular
      .map((p) => tcodeMap.get(p.selectedTcodeId!))
      .filter(Boolean)
      .map((t) => ({ label: t!.tcode, type: 'tcode' as const }));
  } catch {
    return null;
  }
}

export default async function Home() {
  const popularTCodes = await getPopularTCodes();
  const searches = popularTCodes || FALLBACK_SEARCHES;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      <main id="main-content" className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-8 pt-12 md:pt-24">
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Stop Memorizing T-Codes.
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
              Just describe what you need. AI finds the right SAP transaction in seconds.
            </p>
          </div>

          <div className="w-full max-w-2xl">
            <UnifiedSearchBar variant="hero" />
          </div>

          {/* Example / Popular searches */}
          <div className="flex flex-wrap justify-center gap-2">
            <span className="text-xs text-muted-foreground self-center">
              {popularTCodes ? 'Popular:' : 'Try:'}
            </span>
            {searches.map((example) => (
              <a
                key={example.label}
                href={`/search?q=${encodeURIComponent(example.label)}&mode=${example.type === 'tcode' ? 'keyword' : 'ai'}`}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground min-h-[44px] flex items-center"
              >
                {example.label}
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
