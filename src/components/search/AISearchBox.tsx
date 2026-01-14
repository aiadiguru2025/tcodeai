'use client';

import { useState, useCallback } from 'react';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AISearchResults } from './AISearchResults';
import type { AISearchResult } from '@/types';

const EXAMPLE_PROMPTS = [
  'Create a purchase order',
  'Display vendor invoices',
  'Run payroll for USA',
  'Check material stock levels',
  'Post goods receipt',
  'Create sales order',
];

interface AISearchBoxProps {
  className?: string;
}

export function AISearchBox({ className }: AISearchBoxProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AISearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setError('Please describe what you need in more detail');
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch('/api/v1/search/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 5 }),
      });

      if (!res.ok) {
        throw new Error('Search failed');
      }

      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setError('AI search is temporarily unavailable. Please try the regular search.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSearch(query);
    },
    [query, handleSearch]
  );

  const handleExampleClick = useCallback(
    (example: string) => {
      setQuery(example);
      handleSearch(example);
    },
    [handleSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSearch(query);
      }
    },
    [query, handleSearch]
  );

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Describe what you need in plain English</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="I want to display payroll results for an employee..."
            className="min-h-[80px] resize-none pr-12 text-base"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || query.length < 3}
            className="absolute bottom-2 right-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>

      {/* Example prompts */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground">Try:</span>
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => handleExampleClick(example)}
            disabled={isLoading}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {hasSearched && !error && (
        <AISearchResults results={results} isLoading={isLoading} query={query} />
      )}
    </div>
  );
}
