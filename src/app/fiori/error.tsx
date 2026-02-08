'use client';

import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function FioriError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Fiori page error:', error);
  }, [error]);

  return (
    <div className="flex-1 bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl text-center space-y-4 py-12">
          <div className="inline-flex rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Failed to load Fiori apps</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            We couldn&apos;t load the Fiori apps page. Please try again.
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" asChild>
              <a href="/">Back to search</a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
