import OpenAI from 'openai';
import { executeSemanticSearch } from './semantic-search';
import { getCached, setCached } from '@/lib/cache';
import type { AISearchResult } from '@/types';

const EXPLANATION_MODEL = 'gpt-4o-mini';
const CACHE_PREFIX = 'ai-search';
const CACHE_TTL = 60 * 60 * 24; // 24 hours
const GPT_TIMEOUT_MS = 8000; // 8 seconds max for GPT call (reduced from 15s)

/**
 * Create a timeout promise
 */
function timeout<T>(ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fallback), ms));
}

/**
 * Generate default explanations from semantic search results
 */
function createDefaultResults(
  candidates: Awaited<ReturnType<typeof executeSemanticSearch>>
): AISearchResult[] {
  return candidates.map((c) => ({
    tcode: c.tcode,
    description: c.description,
    module: c.module,
    explanation: `Matches your search based on description similarity.`,
    confidence: c.relevanceScore,
  }));
}

export async function executeAISearch(
  query: string,
  limit: number = 5
): Promise<{ results: AISearchResult[]; cached: boolean }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Check cache first
  const cacheKey = `${query}:${limit}`;
  const cached = await getCached<AISearchResult[]>(CACHE_PREFIX, cacheKey);
  if (cached) {
    console.log('AI search cache hit:', query);
    // Sort cached results by confidence (older cache entries may not be sorted)
    cached.sort((a, b) => b.confidence - a.confidence);
    return { results: cached, cached: true };
  }

  console.log('AI search cache miss:', query);

  // Get semantic search results as candidates
  const candidates = await executeSemanticSearch(query, undefined, false, limit);

  if (candidates.length === 0) {
    return { results: [], cached: false };
  }

  // Format candidates for the prompt (shorter format)
  const candidateList = candidates
    .map((c) => `${c.tcode}: ${c.description || 'N/A'}`)
    .join('\n');

  // Try to get GPT explanations with timeout
  const openai = new OpenAI();

  const gptPromise = openai.chat.completions
    .create({
      model: EXPLANATION_MODEL,
      messages: [
        {
          role: 'system',
          content: `SAP expert. Brief explanation why each T-code matches. JSON: {"results":[{"tcode":"XX01","explanation":"...","confidence":0.9}]}`,
        },
        {
          role: 'user',
          content: `"${query}"\n${candidateList}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 400,
    })
    .then((response) => response.choices[0]?.message?.content)
    .catch((err) => {
      console.error('GPT error:', err);
      return null;
    });

  // Race between GPT call and timeout
  const content = await Promise.race([gptPromise, timeout(GPT_TIMEOUT_MS, null)]);

  let results: AISearchResult[];

  if (!content) {
    // Timeout or error - use default explanations
    console.log('GPT timed out or failed, using semantic results');
    results = createDefaultResults(candidates);
  } else {
    try {
      const parsed = JSON.parse(content) as {
        results: Array<{ tcode: string; explanation: string; confidence: number }>;
      };

      results = candidates.map((candidate) => {
        const explanation = parsed.results.find(
          (r) => r.tcode.toUpperCase() === candidate.tcode.toUpperCase()
        );

        return {
          tcode: candidate.tcode,
          description: candidate.description,
          module: candidate.module,
          explanation: explanation?.explanation || 'Matches your search criteria.',
          confidence: explanation?.confidence ?? candidate.relevanceScore,
        };
      });
    } catch {
      results = createDefaultResults(candidates);
    }
  }

  // Sort results by confidence score (highest first) for accurate "Best Match"
  results.sort((a, b) => b.confidence - a.confidence);

  // Store in cache (even default results, to avoid repeated timeouts)
  await setCached(CACHE_PREFIX, cacheKey, results, CACHE_TTL);

  return { results, cached: false };
}
