import prisma from '@/lib/db';
import { getCached, setCached, deleteCached } from '@/lib/cache';

const FEEDBACK_CACHE_PREFIX = 'feedback-scores';
const FEEDBACK_CACHE_TTL = 60 * 60; // 1 hour

interface FeedbackScore {
  tcode: string;
  upvotes: number;
  downvotes: number;
  netScore: number;
  boostFactor: number;
}

/**
 * Calculate boost factor from vote counts
 * Positive votes increase ranking, negative votes decrease it
 * Uses a logarithmic scale to prevent extreme boosts
 */
function calculateBoostFactor(upvotes: number, downvotes: number): number {
  const netScore = upvotes - downvotes;

  if (netScore === 0) return 1.0;

  // Logarithmic scaling to prevent extreme boosts
  // Max boost: ~1.5x for highly upvoted, min: ~0.7x for highly downvoted
  const scaledScore = Math.sign(netScore) * Math.log10(1 + Math.abs(netScore)) * 0.15;

  // Clamp between 0.7 and 1.5
  return Math.max(0.7, Math.min(1.5, 1 + scaledScore));
}

/**
 * Get aggregated feedback scores for a list of T-codes
 * Uses caching to minimize database queries
 */
export async function getFeedbackScores(
  tcodes: string[]
): Promise<Map<string, FeedbackScore>> {
  if (tcodes.length === 0) {
    return new Map();
  }

  const result = new Map<string, FeedbackScore>();
  const uncachedTcodes: string[] = [];

  // Check cache first for each T-code
  for (const tcode of tcodes) {
    const cached = await getCached<FeedbackScore>(FEEDBACK_CACHE_PREFIX, tcode);
    if (cached) {
      result.set(tcode, cached);
    } else {
      uncachedTcodes.push(tcode);
    }
  }

  // If all T-codes were cached, return early
  if (uncachedTcodes.length === 0) {
    return result;
  }

  // Query database for uncached T-codes
  try {
    const feedbackData = await prisma.feedback.groupBy({
      by: ['tcodeId'],
      where: {
        tcode: {
          tcode: { in: uncachedTcodes },
        },
      },
      _sum: {
        vote: true,
      },
      _count: {
        _all: true,
      },
    });

    // Get T-code mapping (tcodeId -> tcode string)
    const tcodeIds = feedbackData.map((f) => f.tcodeId);
    const tcodeMapping = await prisma.transactionCode.findMany({
      where: { id: { in: tcodeIds } },
      select: { id: true, tcode: true },
    });

    const idToTcode = new Map(tcodeMapping.map((t) => [t.id, t.tcode]));

    // Process feedback data
    for (const feedback of feedbackData) {
      const tcode = idToTcode.get(feedback.tcodeId);
      if (!tcode) continue;

      const totalVotes = feedback._count._all;
      const netScore = feedback._sum.vote ?? 0;

      // Calculate upvotes and downvotes from total and net
      // upvotes - downvotes = netScore
      // upvotes + downvotes = totalVotes
      // Therefore: upvotes = (totalVotes + netScore) / 2
      const upvotes = Math.round((totalVotes + netScore) / 2);
      const downvotes = totalVotes - upvotes;

      const score: FeedbackScore = {
        tcode,
        upvotes,
        downvotes,
        netScore,
        boostFactor: calculateBoostFactor(upvotes, downvotes),
      };

      result.set(tcode, score);

      // Cache the result
      await setCached(FEEDBACK_CACHE_PREFIX, tcode, score, FEEDBACK_CACHE_TTL);
    }

    // Cache zero-score for T-codes with no feedback
    for (const tcode of uncachedTcodes) {
      if (!result.has(tcode)) {
        const zeroScore: FeedbackScore = {
          tcode,
          upvotes: 0,
          downvotes: 0,
          netScore: 0,
          boostFactor: 1.0,
        };
        result.set(tcode, zeroScore);
        await setCached(FEEDBACK_CACHE_PREFIX, tcode, zeroScore, FEEDBACK_CACHE_TTL);
      }
    }
  } catch (error) {
    console.error('Error fetching feedback scores:', error);
    // Return what we have from cache, with default scores for uncached
    for (const tcode of uncachedTcodes) {
      if (!result.has(tcode)) {
        result.set(tcode, {
          tcode,
          upvotes: 0,
          downvotes: 0,
          netScore: 0,
          boostFactor: 1.0,
        });
      }
    }
  }

  return result;
}

/**
 * Invalidate feedback cache for a specific T-code
 * Called when a new vote is submitted
 */
export async function invalidateFeedbackCache(tcode: string): Promise<void> {
  await deleteCached(FEEDBACK_CACHE_PREFIX, tcode);
}

/**
 * Apply feedback boost to search results
 * Modifies relevanceScore in place and returns the results
 */
export async function applyFeedbackBoost<
  T extends { tcode: string; relevanceScore: number }
>(results: T[]): Promise<T[]> {
  if (results.length === 0) return results;

  const tcodes = results.map((r) => r.tcode);
  const feedbackScores = await getFeedbackScores(tcodes);

  for (const result of results) {
    const feedback = feedbackScores.get(result.tcode);
    if (feedback && feedback.boostFactor !== 1.0) {
      result.relevanceScore *= feedback.boostFactor;
    }
  }

  return results;
}

/**
 * Apply feedback boost to AI search results
 * Modifies confidence in place and returns the results
 */
export async function applyFeedbackBoostToAI<
  T extends { tcode: string; confidence: number }
>(results: T[]): Promise<T[]> {
  if (results.length === 0) return results;

  const tcodes = results.map((r) => r.tcode);
  const feedbackScores = await getFeedbackScores(tcodes);

  for (const result of results) {
    const feedback = feedbackScores.get(result.tcode);
    if (feedback && feedback.boostFactor !== 1.0) {
      // Apply boost but cap confidence at 0.99
      result.confidence = Math.min(0.99, result.confidence * feedback.boostFactor);
    }
  }

  return results;
}
