import { UnifiedSearchBar } from '@/components/search/UnifiedSearchBar';
import { Header } from '@/components/layout/Header';

const EXAMPLE_SEARCHES = [
  { label: 'ME21N', type: 'tcode' as const },
  { label: 'Create purchase order', type: 'ai' as const },
  { label: 'VA01', type: 'tcode' as const },
  { label: 'Post goods receipt', type: 'ai' as const },
  { label: 'Display vendor invoices', type: 'ai' as const },
  { label: 'FB01', type: 'tcode' as const },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      <main id="main-content" className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-8 pt-12 md:pt-24">
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              <span className="text-primary">TCode</span>AI
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
              Find SAP transaction codes using plain English. Search by T-code name or describe what
              you need.
            </p>
          </div>

          <div className="w-full max-w-2xl">
            <UnifiedSearchBar variant="hero" />
          </div>

          {/* Example searches */}
          <div className="flex flex-wrap justify-center gap-2">
            <span className="text-xs text-muted-foreground self-center">Try:</span>
            {EXAMPLE_SEARCHES.map((example) => (
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
