'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Sparkles, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Suggestion {
  tcode: string;
  description: string | null;
  module: string | null;
}

type SearchMode = 'auto' | 'keyword' | 'ai';

/** Detects if a query looks like a T-code pattern (e.g., ME21N, VA01, /BEV1/EM0) */
function looksLikeTCode(query: string): boolean {
  const trimmed = query.trim();
  // Short alphanumeric with optional leading slash - likely a T-code
  return /^\/?\w{1,12}$/.test(trimmed) && !/\s/.test(trimmed);
}

/** Returns the effective mode based on auto-detection */
function getEffectiveMode(query: string, mode: SearchMode): 'keyword' | 'ai' {
  if (mode !== 'auto') return mode;
  return looksLikeTCode(query) ? 'keyword' : 'ai';
}

interface UnifiedSearchBarProps {
  className?: string;
  initialQuery?: string;
  variant?: 'hero' | 'compact';
}

export function UnifiedSearchBar({ className, initialQuery = '', variant = 'compact' }: UnifiedSearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<SearchMode>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const effectiveMode = query.trim() ? getEffectiveMode(query, mode) : null;

  // Fetch autocomplete suggestions (only for keyword-like queries)
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    // Only fetch autocomplete for keyword-like queries
    const effective = getEffectiveMode(searchQuery, mode);
    if (effective === 'ai' && searchQuery.length > 6) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`/api/v1/search/autocomplete?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    }
  }, [mode]);

  // Debounced fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        fetchSuggestions(query);
      } else {
        setSuggestions([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;

      setIsLoading(true);
      setShowSuggestions(false);

      const searchMode = getEffectiveMode(query, mode);
      router.push(`/search?q=${encodeURIComponent(query.trim())}&mode=${searchMode}`);
    },
    [query, mode, router]
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      setQuery(suggestion.tcode);
      setShowSuggestions(false);
      router.push(`/tcode/${suggestion.tcode}`);
    },
    [router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          if (selectedIndex >= 0) {
            e.preventDefault();
            handleSelectSuggestion(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [showSuggestions, suggestions, selectedIndex, handleSelectSuggestion]
  );

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeDescendantId = selectedIndex >= 0 ? `suggestion-${suggestions[selectedIndex]?.tcode}` : undefined;

  const isHero = variant === 'hero';

  return (
    <div className={cn('space-y-3', className)}>
      <form onSubmit={handleSubmit} className="relative" role="search">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={isHero ? 'Search T-codes or describe what you need...' : 'Search T-codes (e.g., ME21N or "create purchase order")'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className={cn(
              'pl-12 pr-12 text-lg shadow-lg',
              isHero ? 'h-16 text-lg' : 'h-14'
            )}
            aria-label="Search SAP transaction codes"
            role="combobox"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-controls="search-suggestions"
            aria-activedescendant={activeDescendantId}
            aria-autocomplete="list"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setMode('auto');
                inputRef.current?.focus();
              }}
              className="absolute right-12 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-thinking-dot" style={{ animationDelay: '0s' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-thinking-dot" style={{ animationDelay: '0.2s' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-thinking-dot" style={{ animationDelay: '0.4s' }} />
            </div>
          )}
        </div>

        {/* Autocomplete suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            id="search-suggestions"
            role="listbox"
            aria-label="Search suggestions"
            className="absolute z-50 mt-2 w-full rounded-lg border bg-popover p-2 shadow-lg opacity-0 animate-scale-in"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.tcode}
                id={`suggestion-${suggestion.tcode}`}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handleSelectSuggestion(suggestion)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors min-h-[44px]',
                  index === selectedIndex ? 'bg-accent' : 'hover:bg-muted'
                )}
              >
                <div className="flex items-center gap-3">
                  <code className="font-bold text-primary">{suggestion.tcode}</code>
                  <span className="truncate text-sm text-muted-foreground">
                    {suggestion.description || 'No description'}
                  </span>
                </div>
                {suggestion.module && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {suggestion.module}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Search mode toggle + detection indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Search mode">
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'auto'}
            onClick={() => setMode('auto')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 min-h-[44px]',
              mode === 'auto'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            Auto
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'keyword'}
            onClick={() => setMode('keyword')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 flex items-center gap-1 min-h-[44px]',
              mode === 'keyword'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <Zap className="h-3 w-3" aria-hidden="true" />
            Keyword
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'ai'}
            onClick={() => setMode('ai')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 flex items-center gap-1 min-h-[44px]',
              mode === 'ai'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            AI Search
          </button>
        </div>

        {/* Auto-detection indicator */}
        {query.trim() && mode === 'auto' && effectiveMode && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {effectiveMode === 'ai' ? (
              <>
                <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
                Using AI search
              </>
            ) : (
              <>
                <Zap className="h-3 w-3 text-primary" aria-hidden="true" />
                Using keyword search
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
