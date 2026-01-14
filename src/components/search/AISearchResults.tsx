'use client';

import Link from 'next/link';
import { Sparkles, Lightbulb, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AISearchResult } from '@/types';

interface AISearchResultsProps {
  results: AISearchResult[];
  isLoading: boolean;
  query: string;
}

export function AISearchResults({ results, isLoading, query }: AISearchResultsProps) {
  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 animate-pulse text-primary" />
            <span>AI is thinking...</span>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4 text-center text-muted-foreground">
          <p>No T-codes found matching your description.</p>
          <p className="mt-1 text-sm">Try being more specific or using different terms.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>AI Suggested T-Codes</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {results.length} results
          </Badge>
        </div>

        <div className="space-y-3">
          {results.map((result, index) => (
            <Link
              key={result.tcode}
              href={`/tcode/${result.tcode}`}
              className={cn(
                'block rounded-lg border p-4 transition-all hover:border-primary hover:shadow-md',
                index === 0 && 'border-primary/50 bg-primary/5'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-bold text-primary">{result.tcode}</code>
                    {result.module && (
                      <Badge
                        variant={
                          (result.module.toLowerCase() as 'mm' | 'sd' | 'fi' | 'co' | 'pp' | 'hr') ||
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {result.module}
                      </Badge>
                    )}
                    {index === 0 && (
                      <Badge variant="default" className="text-xs">
                        Best Match
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {result.description || 'No description available'}
                  </p>

                  <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2">
                    <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                    <p className="text-sm">{result.explanation}</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Confidence: {Math.round(result.confidence * 100)}%</span>
                  </div>
                </div>

                <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
