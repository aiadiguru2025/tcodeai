import { NextResponse } from 'next/server';
import { getCacheStats, isRedisAvailable } from '@/lib/cache';

export async function GET() {
  const stats = getCacheStats();

  const status = {
    cacheEnabled: true,
    cacheType: stats.redisAvailable ? 'redis + memory' : 'memory-only',
    redisConnected: stats.redisAvailable,
    memoryCacheEntries: stats.memoryEntries,
    message: stats.redisAvailable
      ? 'Using Redis with in-memory fallback'
      : 'Using in-memory cache (Redis not configured)',
  };

  return NextResponse.json(status);
}
