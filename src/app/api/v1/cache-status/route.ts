import { NextResponse } from 'next/server';
import { getCacheStats } from '@/lib/cache';

export async function GET() {
  const stats = getCacheStats();

  return NextResponse.json({
    cacheEnabled: true,
    cacheType: stats.redisAvailable ? 'redis + memory' : 'memory-only',
    redisConnected: stats.redisAvailable,
    memoryCacheEntries: stats.memoryEntries,
  });
}
