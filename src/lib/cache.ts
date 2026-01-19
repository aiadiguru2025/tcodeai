import { Redis } from '@upstash/redis';

// Initialize Redis client (lazy initialization)
let redis: Redis | null = null;
let redisChecked = false;

function getRedis(): Redis | null {
  if (redisChecked) return redis;
  redisChecked = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Check for missing or placeholder values
  if (!url || !token || url === 'https://...' || token === '...' || url.length < 20) {
    console.log('Using in-memory cache (Redis not configured)');
    return null;
  }

  try {
    redis = new Redis({ url, token });
    console.log('Using Redis cache');
    return redis;
  } catch {
    console.log('Using in-memory cache (Redis init failed)');
    return null;
  }
}

// ============================================
// In-Memory LRU Cache (fallback when no Redis)
// ============================================
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class LRUCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global in-memory cache instance
const memoryCache = new LRUCache(2000); // Store up to 2000 entries

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
 * Get cached value (Redis with in-memory fallback)
 */
export async function getCached<T>(prefix: string, query: string): Promise<T | null> {
  const key = generateCacheKey(prefix, query);
  const client = getRedis();

  // Try Redis first if available
  if (client) {
    try {
      const cached = await client.get<T>(key);
      return cached;
    } catch (error) {
      console.error('Redis get error:', error);
      // Fall through to memory cache
    }
  }

  // Fall back to in-memory cache
  return memoryCache.get<T>(key);
}

/**
 * Set cached value with TTL (Redis + in-memory)
 */
export async function setCached<T>(
  prefix: string,
  query: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL
): Promise<void> {
  const key = generateCacheKey(prefix, query);
  const client = getRedis();

  // Always store in memory cache for fast local access
  memoryCache.set(key, value, ttlSeconds);

  // Also store in Redis if available (for persistence across restarts)
  if (client) {
    try {
      await client.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }
}

/**
 * Delete cached value (from both Redis and memory)
 */
export async function deleteCached(prefix: string, query: string): Promise<void> {
  const key = generateCacheKey(prefix, query);

  // Delete from memory cache
  memoryCache.delete(key);

  // Delete from Redis if available
  const client = getRedis();
  if (client) {
    try {
      await client.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }
}

/**
 * Check if caching is available (always true now with in-memory fallback)
 */
export function isCacheAvailable(): boolean {
  return true; // In-memory cache is always available
}

/**
 * Check if Redis is being used
 */
export function isRedisAvailable(): boolean {
  return getRedis() !== null;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { memoryEntries: number; redisAvailable: boolean } {
  return {
    memoryEntries: memoryCache.size(),
    redisAvailable: getRedis() !== null,
  };
}

/**
 * Flush all cache (both Redis and in-memory)
 * Returns the number of keys flushed from each store
 */
export async function flushAllCache(): Promise<{
  memoryFlushed: number;
  redisFlushed: boolean;
  error?: string;
}> {
  const memorySize = memoryCache.size();

  // Clear in-memory cache
  memoryCache.clear();

  // Clear Redis if available
  const client = getRedis();
  let redisFlushed = false;
  let error: string | undefined;

  if (client) {
    try {
      await client.flushall();
      redisFlushed = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Redis flush failed';
      console.error('Redis flushall error:', err);
    }
  }

  return {
    memoryFlushed: memorySize,
    redisFlushed,
    error,
  };
}
