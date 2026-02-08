'use client';

import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { SearchBar } from '@/components/search/SearchBar';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Search error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <SearchBar className="mb-8" />
          <div className="text-center space-y-4 py-12">
            <div className="inline-flex rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Search failed</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              We couldn&apos;t complete your search. This might be a temporary issue.
            </p>
            <Button onClick={reset}>Try again</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
