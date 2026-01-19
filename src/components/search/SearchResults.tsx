import Link from 'next/link';
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
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No results found for &ldquo;{query}&rdquo;</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Try different keywords or check your spelling
        </p>
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
