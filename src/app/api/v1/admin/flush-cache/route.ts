import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { flushAllCache, getCacheStats } from '@/lib/cache';

/**
 * Validate admin authorization using timing-safe comparison
 */
function validateAdminAuth(request: NextRequest): { authorized: boolean; response?: NextResponse } {
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Admin API not configured.' },
        { status: 503 }
      ),
    };
  }

  const token = authHeader?.replace('Bearer ', '') || '';

  // Use timing-safe comparison to prevent timing attacks
  try {
    const tokenBuffer = Buffer.from(token);
    const secretBuffer = Buffer.from(adminSecret);
    if (tokenBuffer.length !== secretBuffer.length || !timingSafeEqual(tokenBuffer, secretBuffer)) {
      return {
        authorized: false,
        response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }),
      };
    }
  } catch {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }),
    };
  }

  return { authorized: true };
}

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
  const auth = validateAdminAuth(request);
  if (!auth.authorized) return auth.response!;

  try {
    const beforeStats = getCacheStats();
    const result = await flushAllCache();
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
      ...(result.error && { warning: 'Redis flush encountered an issue' }),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to flush cache' }, { status: 500 });
  }
}

/**
 * GET /api/v1/admin/flush-cache
 *
 * Get current cache statistics
 * Requires ADMIN_SECRET header for authorization
 */
export async function GET(request: NextRequest) {
  const auth = validateAdminAuth(request);
  if (!auth.authorized) return auth.response!;

  const stats = getCacheStats();

  return NextResponse.json({
    memoryEntries: stats.memoryEntries,
    redisAvailable: stats.redisAvailable,
    cacheType: stats.redisAvailable ? 'redis' : 'in-memory',
  });
}
