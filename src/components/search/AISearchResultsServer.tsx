import Link from 'next/link';
import { Sparkles, Lightbulb, ExternalLink, AlertTriangle, Globe, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { executeAISearch } from '@/lib/search/ai-search';
import type { AISearchResult } from '@/types';

export async function AISearchResultsServer({ query }: { query: string }) {
  let results: AISearchResult[] = [];

  try {
    const searchResult = await executeAISearch(query, 5);
    results = searchResult.results;
  } catch (error) {
    console.error('AI search error:', error);
  }

  if (results.length === 0) {
    return (
      <div className="py-12 text-center space-y-4 opacity-0 animate-fade-in-up">
        <div className="inline-flex rounded-full bg-muted p-3">
          <Search className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-muted-foreground">
          No T-codes found for &ldquo;{query}&rdquo;
        </p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Suggestions:</p>
          <ul className="space-y-1">
            <li>Try being more specific (e.g., &ldquo;create a purchase order in MM&rdquo;)</li>
            <li>Use SAP module names (MM, SD, FI, CO, PP, HR)</li>
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

  const isAIGenerated = results.some((r) => r.aiGenerated);

  if (isAIGenerated) {
    return (
      <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10 opacity-0 animate-scale-in">
        <CardContent className="p-4">
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
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
            {results.map((result, index) => (
              <div
                key={result.tcode}
                className="block rounded-lg border border-amber-200 bg-white p-4 dark:border-amber-800 dark:bg-gray-900 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${0.1 + index * 0.08}s` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-lg font-bold text-amber-600 dark:text-amber-400">
                        {result.tcode}
                      </code>
                      {result.module && (
                        <Badge variant="outline" className="border-amber-300 text-xs dark:border-amber-700">
                          {result.module}
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-amber-500/50 text-xs text-amber-600 dark:text-amber-400">
                        AI Suggestion
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.description || 'No description available'}
                    </p>
                    <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2 dark:bg-amber-950/30">
                      <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" aria-hidden="true" />
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

  return (
    <Card className="border-primary/20 opacity-0 animate-scale-in">
      <CardContent className="p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
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
                'block rounded-lg border p-4 transition-all hover:border-primary hover:shadow-md opacity-0 animate-fade-in-up',
                index === 0 && 'border-primary/50 bg-primary/5'
              )}
              style={{ animationDelay: `${0.1 + index * 0.08}s` }}
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
                        <Globe className="h-3 w-3 mr-1" aria-hidden="true" />
                        Web Enhanced
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {result.description || 'No description available'}
                  </p>
                  <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2">
                    <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" aria-hidden="true" />
                    <p className="text-sm">{result.explanation}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Confidence: {Math.round(result.confidence * 100)}%</span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
