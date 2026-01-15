import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const querySchema = z.object({
  q: z.string().optional(),
  tech: z.string().optional(),
  lob: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = querySchema.parse({
      q: searchParams.get('q') || undefined,
      tech: searchParams.get('tech') || undefined,
      lob: searchParams.get('lob') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    const { q, tech, lob, page, limit } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.FioriAppWhereInput = {};

    if (q) {
      where.OR = [
        { appId: { contains: q, mode: 'insensitive' } },
        { appName: { contains: q, mode: 'insensitive' } },
        { appLauncherTitle: { contains: q, mode: 'insensitive' } },
        { businessCatalogTitle: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (tech) {
      where.uiTechnology = { equals: tech, mode: 'insensitive' };
    }

    if (lob) {
      where.lineOfBusiness = { has: lob };
    }

    // Get total count
    const total = await prisma.fioriApp.count({ where });

    // Get apps
    const apps = await prisma.fioriApp.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ appName: 'asc' }],
      select: {
        id: true,
        appId: true,
        appName: true,
        appLauncherTitle: true,
        uiTechnology: true,
        appComponentDesc: true,
        lineOfBusiness: true,
        semanticObjectAction: true,
        businessCatalogTitle: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      apps,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching Fiori apps:', error);
    return NextResponse.json({ error: 'Failed to fetch Fiori apps' }, { status: 500 });
  }
}
