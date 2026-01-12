import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchResultsSkeleton } from '@/components/search/SearchResultsSkeleton';

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q || '';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <SearchBar className="mb-8" />

          {query && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-muted-foreground">
                Results for &ldquo;{query}&rdquo;
              </h2>
              <Suspense fallback={<SearchResultsSkeleton />}>
                <SearchResults query={query} />
              </Suspense>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
