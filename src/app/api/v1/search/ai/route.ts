import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { executeAISearch } from '@/lib/search/ai-search';
import type { AISearchResponse } from '@/types';

const querySchema = z.object({
  query: z.string().min(3, 'Query must be at least 3 characters'),
  limit: z.number().min(1).max(10).optional().default(5),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { query, limit } = querySchema.parse(body);

    const results = await executeAISearch(query, limit);

    const response: AISearchResponse = {
      results,
      query,
      processingTimeMs: Date.now() - startTime,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('AI search error:', error);
    return NextResponse.json(
      { error: 'AI search failed. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json(
      { error: 'Query parameter "q" must be at least 3 characters' },
      { status: 400 }
    );
  }

  try {
    const results = await executeAISearch(query, 5);

    const response: AISearchResponse = {
      results,
      query,
      processingTimeMs: Date.now() - startTime,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI search error:', error);
    return NextResponse.json(
      { error: 'AI search failed. Please try again.' },
      { status: 500 }
    );
  }
}
