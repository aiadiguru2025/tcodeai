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
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground min-h-[32px] flex items-center"
              >
                {example.label}
              </a>
            ))}
          </div>
        </div>

        <section className="mt-24 grid gap-8 md:grid-cols-3">
          <FeatureCard
            title="Natural Language Search"
            description="Describe what you want to do in plain English and get the right T-code instantly."
            icon="search"
          />
          <FeatureCard
            title="134K+ T-Codes"
            description="Comprehensive database covering all SAP modules - MM, SD, FI, CO, PP, HR, and more."
            icon="database"
          />
          <FeatureCard
            title="Smart Suggestions"
            description="Get alternative T-codes and related transactions for your task."
            icon="lightbulb"
          />
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: 'search' | 'database' | 'lightbulb';
}) {
  const icons = {
    search: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
    database: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 7v10c0 2 4 4 8 4s8-2 8-4V7M4 7c0 2 4 4 8 4s8-2 8-4M4 7c0-2 4-4 8-4s8 2 8 4"
        />
      </svg>
    ),
    lightbulb: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg">
      <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">{icons[icon]}</div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
