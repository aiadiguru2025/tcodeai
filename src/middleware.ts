import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory rate limiter for API routes.
 *
 * Note: In serverless environments each instance has its own Map,
 * so this provides best-effort rate limiting. For production at scale,
 * replace with Upstash Redis-based rate limiting (@upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 10_000;

// Rate limit configuration per route pattern (requests per window)
const RATE_LIMITS: { pattern: string; limit: number; windowMs: number }[] = [
  { pattern: '/api/v1/search/ai', limit: 20, windowMs: 60_000 },
  { pattern: '/api/v1/search/query', limit: 60, windowMs: 60_000 },
  { pattern: '/api/v1/search/autocomplete', limit: 120, windowMs: 60_000 },
  { pattern: '/api/v1/feedback', limit: 10, windowMs: 60_000 },
  { pattern: '/api/v1/admin', limit: 5, windowMs: 60_000 },
  { pattern: '/api/v1/fiori', limit: 60, windowMs: 60_000 },
  { pattern: '/api/v1/cache-status', limit: 30, windowMs: 60_000 },
];

const DEFAULT_LIMIT = { limit: 60, windowMs: 60_000 };

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function evictExpiredEntries() {
  if (store.size < MAX_STORE_SIZE) return;
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  // Expired or new - reset
  if (!entry || now > entry.resetAt) {
    evictExpiredEntries();
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Only rate limit API routes
  if (!path.startsWith('/api/')) {
    return NextResponse.next();
  }

  const ip = getClientIP(request);

  // Find matching rate limit config
  const matched = RATE_LIMITS.find((rl) => path.startsWith(rl.pattern));
  const config = matched || DEFAULT_LIMIT;

  const key = `${ip}:${matched?.pattern || path}`;
  const result = checkRateLimit(key, config.limit, config.windowMs);

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(config.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
