import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { executeAISearch } from '@/lib/search/ai-search';

const querySchema = z.object({
  query: z.string().min(3, 'Query must be at least 3 characters'),
  limit: z.number().min(1).max(10).optional().default(5),
});

// Global timeout for the entire AI search operation (50s to stay under Vercel's 60s limit)
const GLOBAL_TIMEOUT_MS = 50000;

/**
 * Execute search with a global timeout to prevent hanging requests
 */
async function executeWithTimeout(
  query: string,
  limit: number,
  timeoutMs: number
): Promise<{
  results: Awaited<ReturnType<typeof executeAISearch>>['results'];
  cached: boolean;
  timedOut?: boolean;
}> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Search timeout'));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([executeAISearch(query, limit), timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    if (error instanceof Error && error.message === 'Search timeout') {
      console.warn(`AI search timed out after ${timeoutMs}ms for query: "${query}"`);
      return { results: [], cached: false, timedOut: true };
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { query, limit } = querySchema.parse(body);

    console.log(`AI search started: "${query.substring(0, 50)}..."`);

    const { results, cached, timedOut } = await executeWithTimeout(query, limit, GLOBAL_TIMEOUT_MS);

    const processingTimeMs = Date.now() - startTime;
    console.log(
      `AI search completed in ${processingTimeMs}ms, ${results.length} results, cached: ${cached}, timedOut: ${timedOut || false}`
    );

    const response = {
      results,
      query,
      processingTimeMs,
      cached,
      ...(timedOut && { warning: 'Search timed out, showing partial or no results' }),
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }

    const processingTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`AI search POST error after ${processingTimeMs}ms:`, errorMessage);
    if (errorStack) {
      console.error('Stack trace:', errorStack);
    }

    return NextResponse.json({ error: `AI search failed: ${errorMessage}. Please try again.` }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json({ error: 'Query parameter "q" must be at least 3 characters' }, { status: 400 });
  }

  try {
    console.log(`AI search GET started: "${query.substring(0, 50)}..."`);

    const { results, cached, timedOut } = await executeWithTimeout(query, 5, GLOBAL_TIMEOUT_MS);

    const processingTimeMs = Date.now() - startTime;
    console.log(
      `AI search GET completed in ${processingTimeMs}ms, ${results.length} results, cached: ${cached}, timedOut: ${timedOut || false}`
    );

    const response = {
      results,
      query,
      processingTimeMs,
      cached,
      ...(timedOut && { warning: 'Search timed out, showing partial or no results' }),
    };

    return NextResponse.json(response);
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`AI search GET error after ${processingTimeMs}ms:`, errorMessage);
    if (errorStack) {
      console.error('Stack trace:', errorStack);
    }

    return NextResponse.json({ error: `AI search failed: ${errorMessage}. Please try again.` }, { status: 500 });
  }
}
