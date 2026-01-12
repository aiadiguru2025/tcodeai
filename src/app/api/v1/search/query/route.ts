import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hybridSearch } from '@/lib/search/hybrid-search';

const searchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  modules: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  includeDeprecated: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const validatedData = searchRequestSchema.parse(body);

    const results = await hybridSearch({
      query: validatedData.query,
      modules: validatedData.modules,
      limit: validatedData.limit,
      includeDeprecated: validatedData.includeDeprecated,
    });

    const processingTimeMs = Date.now() - startTime;

    return NextResponse.json({
      results,
      metadata: {
        totalResults: results.length,
        searchMode: 'hybrid',
        processingTimeMs,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  const startTime = Date.now();

  try {
    const results = await hybridSearch({
      query,
      limit: 20,
      includeDeprecated: false,
    });

    const processingTimeMs = Date.now() - startTime;

    return NextResponse.json({
      results,
      metadata: {
        totalResults: results.length,
        searchMode: 'hybrid',
        processingTimeMs,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
