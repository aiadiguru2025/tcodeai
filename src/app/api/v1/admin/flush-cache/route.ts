import { NextRequest, NextResponse } from 'next/server';
import { flushAllCache, getCacheStats } from '@/lib/cache';

/**
 * POST /api/v1/admin/flush-cache
 *
 * Flush all cache (Redis + in-memory)
 * Requires ADMIN_SECRET header for authorization
 *
 * Usage:
 * curl -X POST https://your-domain.com/api/v1/admin/flush-cache \
 *   -H "Authorization: Bearer YOUR_ADMIN_SECRET"
 */
export async function POST(request: NextRequest) {
  // Check authorization
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;

  // If no admin secret is configured, deny all requests
  if (!adminSecret) {
    return NextResponse.json(
      { error: 'Admin API not configured. Set ADMIN_SECRET environment variable.' },
      { status: 503 }
    );
  }

  // Validate auth header
  const token = authHeader?.replace('Bearer ', '');
  if (token !== adminSecret) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or missing Authorization header.' },
      { status: 401 }
    );
  }

  try {
    // Get stats before flush
    const beforeStats = getCacheStats();

    // Flush all cache
    const result = await flushAllCache();

    // Get stats after flush
    const afterStats = getCacheStats();

    return NextResponse.json({
      success: true,
      message: 'Cache flushed successfully',
      details: {
        memoryEntriesFlushed: result.memoryFlushed,
        redisFlushed: result.redisFlushed,
        redisWasAvailable: beforeStats.redisAvailable,
        currentMemoryEntries: afterStats.memoryEntries,
      },
      ...(result.error && { warning: result.error }),
    });
  } catch (error) {
    console.error('Cache flush error:', error);
    return NextResponse.json(
      { error: 'Failed to flush cache', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/admin/flush-cache
 *
 * Get current cache statistics (no auth required for read-only)
 */
export async function GET() {
  const stats = getCacheStats();

  return NextResponse.json({
    memoryEntries: stats.memoryEntries,
    redisAvailable: stats.redisAvailable,
    cacheType: stats.redisAvailable ? 'redis' : 'in-memory',
  });
}
