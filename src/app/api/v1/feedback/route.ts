import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { invalidateFeedbackCache } from '@/lib/search/feedback-ranking';

const feedbackSchema = z.object({
  tcodeId: z.number().optional(),
  tcode: z.string().min(1),
  vote: z.union([z.literal(1), z.literal(-1)]),
  comment: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = feedbackSchema.parse(body);

    // Get the T-code ID if not provided
    let tcodeId = data.tcodeId;
    if (!tcodeId) {
      const tcode = await prisma.transactionCode.findUnique({
        where: { tcode: data.tcode.toUpperCase() },
        select: { id: true },
      });

      if (!tcode) {
        return NextResponse.json({ error: 'T-code not found' }, { status: 404 });
      }

      tcodeId = tcode.id;
    }

    // Get session ID from cookies or generate one
    const sessionId =
      request.cookies.get('session_id')?.value ||
      crypto.randomUUID();

    // Create feedback entry
    await prisma.feedback.create({
      data: {
        tcodeId,
        sessionId,
        vote: data.vote,
        comment: data.comment,
      },
    });

    // Invalidate feedback cache for this T-code so next search reflects the new vote
    await invalidateFeedbackCache(data.tcode.toUpperCase());

    const response = NextResponse.json({ success: true });

    // Set session cookie if not present
    if (!request.cookies.get('session_id')) {
      response.cookies.set('session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
