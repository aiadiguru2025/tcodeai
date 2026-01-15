import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    const decodedAppId = decodeURIComponent(params.appId);
    const app = await prisma.fioriApp.findUnique({
      where: { appId: decodedAppId },
      include: {
        tcodeMappings: {
          include: {
            tcode: {
              select: {
                id: true,
                tcode: true,
                description: true,
                module: true,
              },
            },
          },
        },
      },
    });

    if (!app) {
      return NextResponse.json({ error: 'Fiori app not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: app.id,
      appId: app.appId,
      appName: app.appName,
      appLauncherTitle: app.appLauncherTitle,
      uiTechnology: app.uiTechnology,
      appComponentDesc: app.appComponentDesc,
      lineOfBusiness: app.lineOfBusiness,
      semanticObjectAction: app.semanticObjectAction,
      businessCatalogTitle: app.businessCatalogTitle,
      createdAt: app.createdAt,
      linkedTCodes: app.tcodeMappings.map((m) => ({
        tcodeRaw: m.tcodeRaw,
        tcode: m.tcode
          ? {
              id: m.tcode.id,
              tcode: m.tcode.tcode,
              description: m.tcode.description,
              module: m.tcode.module,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching Fiori app:', error);
    return NextResponse.json({ error: 'Failed to fetch Fiori app' }, { status: 500 });
  }
}
