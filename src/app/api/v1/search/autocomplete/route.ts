import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const upperQuery = query.toUpperCase();

    // Get T-code suggestions (prefix match)
    const tcodes = await prisma.transactionCode.findMany({
      where: {
        tcode: {
          startsWith: upperQuery,
          mode: 'insensitive',
        },
        isDeprecated: false,
      },
      select: {
        tcode: true,
        description: true,
        module: true,
      },
      take: 8,
      orderBy: { tcode: 'asc' },
    });

    // If we have less than 8 results, also search descriptions
    let descriptionMatches: typeof tcodes = [];
    if (tcodes.length < 8) {
      descriptionMatches = await prisma.transactionCode.findMany({
        where: {
          description: {
            contains: query,
            mode: 'insensitive',
          },
          isDeprecated: false,
          NOT: {
            tcode: {
              in: tcodes.map((t) => t.tcode),
            },
          },
        },
        select: {
          tcode: true,
          description: true,
          module: true,
        },
        take: 8 - tcodes.length,
      });
    }

    const suggestions = [...tcodes, ...descriptionMatches].map((t) => ({
      tcode: t.tcode,
      description: t.description,
      module: t.module,
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Autocomplete error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}
