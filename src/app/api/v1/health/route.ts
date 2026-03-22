import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const result = await prisma.transactionCode.count();
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      transactionCodes: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
