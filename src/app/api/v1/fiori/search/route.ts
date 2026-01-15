import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchFioriAppsHybrid } from '@/lib/search/fiori-search';

const searchSchema = z.object({
  q: z.string().min(1),
  tech: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  semantic: z.coerce.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    const params = searchSchema.parse({
      q: searchParams.get('q'),
      tech: searchParams.get('tech') || undefined,
      limit: searchParams.get('limit') || 20,
      semantic: searchParams.get('semantic') !== 'false',
    });

    const results = await searchFioriAppsHybrid(params.q, {
      limit: params.limit,
      tech: params.tech,
      enableSemantic: params.semantic,
    });

    const processingTimeMs = Date.now() - startTime;

    return NextResponse.json({
      query: params.q,
      results,
      metadata: {
        totalResults: results.length,
        processingTimeMs,
        semanticEnabled: params.semantic,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Fiori search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    const params = searchSchema.parse({
      q: body.query || body.q,
      tech: body.tech,
      limit: body.limit || 20,
      semantic: body.semantic !== false,
    });

    const results = await searchFioriAppsHybrid(params.q, {
      limit: params.limit,
      tech: params.tech,
      enableSemantic: params.semantic,
    });

    const processingTimeMs = Date.now() - startTime;

    return NextResponse.json({
      query: params.q,
      results,
      metadata: {
        totalResults: results.length,
        processingTimeMs,
        semanticEnabled: params.semantic,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Fiori search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
