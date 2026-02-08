import Link from 'next/link';
import { Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { SearchResult } from '@/types';

async function fetchSearchResults(query: string): Promise<SearchResult[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/v1/search/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('Search failed');
    }

    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export async function SearchResults({ query }: { query: string }) {
  const results = await fetchSearchResults(query);

  if (results.length === 0) {
    return (
      <div className="py-12 text-center space-y-4">
        <div className="inline-flex rounded-full bg-muted p-3">
          <Search className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-muted-foreground">
          No results found for &ldquo;{query}&rdquo;
        </p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Suggestions:</p>
          <ul className="space-y-1">
            <li>Check your spelling or try a different T-code</li>
            <li>
              <Link
                href={`/search?q=${encodeURIComponent(query)}&mode=ai`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Try AI search
              </Link>
              {' '}for natural language queries
            </li>
            <li>
              <Link href="/modules" className="text-primary hover:underline">
                Browse by module
              </Link>
              {' '}to discover T-codes
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result, index) => (
        <SearchResultCard key={result.tcode} result={result} rank={index + 1} />
      ))}
    </div>
  );
}

function SearchResultCard({ result, rank }: { result: SearchResult; rank: number }) {
  const moduleVariant = result.module?.toLowerCase() as
    | 'mm'
    | 'sd'
    | 'fi'
    | 'co'
    | 'pp'
    | 'hr'
    | 'basis'
    | undefined;

  return (
    <Link href={`/tcode/${encodeURIComponent(result.tcode)}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">#{rank}</span>
                <code className="text-lg font-bold text-primary">{result.tcode}</code>
                {result.module && (
                  <Badge variant={moduleVariant || 'secondary'} className="text-xs">
                    {result.module}
                  </Badge>
                )}
                {result.isDeprecated && (
                  <Badge variant="destructive" className="text-xs">
                    Deprecated
                  </Badge>
                )}
              </div>
              <p className="text-sm text-foreground">
                {result.description || 'No description available'}
              </p>
              {result.program && (
                <p className="text-xs text-muted-foreground">Program: {result.program}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className="text-xs text-muted-foreground"
                title={`Match type: ${result.matchType}`}
              >
                {Math.round(result.relevanceScore * 100)}% match
              </span>
              <span className="text-xs capitalize text-muted-foreground">{result.matchType}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
