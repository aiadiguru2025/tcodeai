import prisma from '@/lib/db';

/**
 * Log a search query asynchronously (fire-and-forget).
 * Never blocks the search response or throws to the caller.
 */
export function logSearch(
  query: string,
  resultsCount: number,
  sessionId?: string | null
): void {
  // Fire-and-forget — don't await, don't block the response
  prisma.searchLog
    .create({
      data: {
        query: query.slice(0, 500), // Truncate long queries
        resultsCount,
        sessionId: sessionId?.slice(0, 100) || null,
      },
    })
    .catch((err) => {
      // Silently ignore — search logging is best-effort
      if (process.env.NODE_ENV === 'development') {
        console.warn('Search log write failed:', err);
      }
    });
}

/**
 * Log when a user selects a T-code from search results.
 * Used for click-through analytics.
 */
export function logSearchSelection(
  query: string,
  selectedTcodeId: number,
  sessionId?: string | null
): void {
  prisma.searchLog
    .create({
      data: {
        query: query.slice(0, 500),
        selectedTcodeId,
        sessionId: sessionId?.slice(0, 100) || null,
      },
    })
    .catch((err) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Search selection log write failed:', err);
      }
    });
}
