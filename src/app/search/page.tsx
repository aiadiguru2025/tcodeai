import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { UnifiedSearchBar } from '@/components/search/UnifiedSearchBar';
import { SearchResults } from '@/components/search/SearchResults';
import { AISearchResultsServer } from '@/components/search/AISearchResultsServer';
import { SearchResultsSkeleton } from '@/components/search/SearchResultsSkeleton';
import { Sparkles, Zap } from 'lucide-react';

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; mode?: string };
}) {
  const query = searchParams.q || '';
  const mode = searchParams.mode === 'ai' ? 'ai' : 'keyword';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <UnifiedSearchBar initialQuery={query} />

          {query && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-medium text-muted-foreground">
                  Results for &ldquo;{query}&rdquo;
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {mode === 'ai' ? (
                    <>
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                      AI Search
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3" aria-hidden="true" />
                      Keyword
                    </>
                  )}
                </span>
              </div>

              <Suspense fallback={<SearchResultsSkeleton />}>
                {mode === 'ai' ? (
                  <AISearchResultsServer query={query} />
                ) : (
                  <SearchResults query={query} />
                )}
              </Suspense>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
