'use client';

import Link from 'next/link';
import { Sparkles, Lightbulb, ExternalLink, AlertTriangle, Globe } from 'lucide-react';
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
          <div className="mb-3 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 animate-pulse text-primary" />
              <span>AI is analyzing your request...</span>
            </div>
            <p className="text-xs text-muted-foreground">This may take a few seconds</p>
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

  // Check if results are AI-generated (fallback mode)
  const isAIGenerated = results.some((r) => r.aiGenerated);

  // AI-generated results get different styling
  if (isAIGenerated) {
    return (
      <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="p-4">
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-amber-700 dark:text-amber-400">AI Suggestions</span>
              <Badge variant="outline" className="ml-auto border-amber-500/50 text-xs text-amber-600">
                {results.length} suggestions
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              These T-codes are suggested by AI based on SAP knowledge. They are NOT verified in our
              database - please verify before use.
            </p>
          </div>

          <div className="space-y-3">
            {results.map((result) => (
              <div
                key={result.tcode}
                className="block rounded-lg border border-amber-200 bg-white p-4 dark:border-amber-800 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-lg font-bold text-amber-600 dark:text-amber-400">
                        {result.tcode}
                      </code>
                      {result.module && (
                        <Badge
                          variant="outline"
                          className="border-amber-300 text-xs dark:border-amber-700"
                        >
                          {result.module}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="border-amber-500/50 text-xs text-amber-600 dark:text-amber-400"
                      >
                        AI Suggestion
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {result.description || 'No description available'}
                    </p>

                    <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2 dark:bg-amber-950/30">
                      <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                      <p className="text-sm">{result.explanation}</p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Confidence: {Math.round(result.confidence * 100)}%</span>
                      <span className="text-amber-600">(AI estimate)</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Standard database results
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
              href={`/tcode/${encodeURIComponent(result.tcode)}`}
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
                    {result.source === 'web' && (
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                        <Globe className="h-3 w-3 mr-1" />
                        Web Enhanced
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
