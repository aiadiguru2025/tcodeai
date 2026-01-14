import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  const status = {
    hasUrl: !!url,
    hasToken: !!token,
    urlPrefix: url ? url.substring(0, 30) + '...' : null,
    connected: false,
    error: null as string | null,
  };

  if (url && token) {
    try {
      const redis = new Redis({ url, token });
      await redis.set('test-key', 'test-value', { ex: 60 });
      const value = await redis.get('test-key');
      status.connected = value === 'test-value';
    } catch (err) {
      status.error = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  return NextResponse.json(status);
}
