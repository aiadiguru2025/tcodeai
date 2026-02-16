import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Log a debug message only in development.
 * Prevents verbose search/cache logs from leaking to production.
 */
export function debugLog(...args: unknown[]): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
}

/** Maximum allowed query length across all search endpoints */
export const MAX_QUERY_LENGTH = 500;

/**
 * Sanitize a user query before embedding it in an LLM prompt.
 * Strips characters that could be used for prompt injection.
 */
export function sanitizeQueryForLLM(query: string): string {
  return query
    .replace(/[\r\n]+/g, ' ')   // collapse newlines
    .replace(/["\\`]/g, '')      // strip quotes and backticks
    .trim()
    .substring(0, MAX_QUERY_LENGTH);
}
