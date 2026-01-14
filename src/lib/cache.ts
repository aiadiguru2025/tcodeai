import { Redis } from '@upstash/redis';

// Initialize Redis client (lazy initialization)
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Check for missing or placeholder values
  if (!url || !token || url === 'https://...' || token === '...' || url.length < 20) {
    console.warn('Upstash Redis not configured - caching disabled');
    return null;
  }

  try {
    redis = new Redis({ url, token });
    return redis;
  } catch {
    console.warn('Failed to initialize Redis client - caching disabled');
    return null;
  }
}

// Cache TTL in seconds (24 hours)
const DEFAULT_TTL = 60 * 60 * 24;

/**
 * Generate a cache key from a query string
 */
function generateCacheKey(prefix: string, query: string): string {
  // Normalize the query: lowercase, trim, remove extra spaces
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${prefix}:${normalized}`;
}

/**
 * Get cached value
 */
export async function getCached<T>(prefix: string, query: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const key = generateCacheKey(prefix, query);
    const cached = await client.get<T>(key);
    return cached;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set cached value with TTL
 */
export async function setCached<T>(
  prefix: string,
  query: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL
): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    const key = generateCacheKey(prefix, query);
    await client.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Delete cached value
 */
export async function deleteCached(prefix: string, query: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    const key = generateCacheKey(prefix, query);
    await client.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Check if caching is available
 */
export function isCacheAvailable(): boolean {
  return getRedis() !== null;
}
