import { NextResponse } from 'next/server';
import { getCacheStats } from '@/lib/cache';

export async function GET() {
  const stats = getCacheStats();

  // Debug: check env vars (safe - only shows if they exist and their length)
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  const status = {
    cacheEnabled: true,
    cacheType: stats.redisAvailable ? 'redis + memory' : 'memory-only',
    redisConnected: stats.redisAvailable,
    memoryCacheEntries: stats.memoryEntries,
    message: stats.redisAvailable
      ? 'Using Redis with in-memory fallback'
      : 'Using in-memory cache (Redis not configured)',
    debug: {
      hasUrl: !!url,
      urlLength: url?.length || 0,
      urlPrefix: url ? url.substring(0, 30) : null,
      hasToken: !!token,
      tokenLength: token?.length || 0,
    },
  };

  return NextResponse.json(status);
}
