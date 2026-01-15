import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { tcode: string } }
) {
  try {
    const tcode = params.tcode.toUpperCase();

    // Find Fiori apps associated with this T-code
    const fioriApps = await prisma.fioriApp.findMany({
      where: {
        tcodeMappings: {
          some: {
            OR: [
              { tcode: { tcode } },
              { tcodeRaw: { equals: tcode, mode: 'insensitive' } },
            ],
          },
        },
      },
      include: {
        tcodeMappings: {
          where: {
            OR: [
              { tcode: { tcode } },
              { tcodeRaw: { equals: tcode, mode: 'insensitive' } },
            ],
          },
          select: {
            tcodeRaw: true,
          },
        },
      },
      orderBy: [{ uiTechnology: 'asc' }, { appName: 'asc' }],
    });

    return NextResponse.json({
      tcode,
      apps: fioriApps.map((app) => ({
        id: app.id,
        appId: app.appId,
        appName: app.appName,
        appLauncherTitle: app.appLauncherTitle,
        uiTechnology: app.uiTechnology,
        appComponentDesc: app.appComponentDesc,
        lineOfBusiness: app.lineOfBusiness,
        semanticObjectAction: app.semanticObjectAction,
        businessCatalogTitle: app.businessCatalogTitle,
      })),
      total: fioriApps.length,
    });
  } catch (error) {
    console.error('Error fetching Fiori apps by T-code:', error);
    return NextResponse.json({ error: 'Failed to fetch Fiori apps' }, { status: 500 });
  }
}
