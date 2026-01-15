import OpenAI from 'openai';
import prisma from '@/lib/db';
import { getCached, setCached } from '@/lib/cache';
import type { SearchResult } from '@/types';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_CACHE_PREFIX = 'embed';
const SEMANTIC_CACHE_PREFIX = 'semantic';
const EMBEDDING_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days for embeddings
const SEMANTIC_CACHE_TTL = 60 * 60 * 4; // 4 hours for full search results

/**
 * Get embedding for a query, using cache when available
 */
async function getQueryEmbedding(query: string): Promise<number[] | null> {
  // Check embedding cache first
  const cached = await getCached<number[]>(EMBEDDING_CACHE_PREFIX, query);
  if (cached) {
    console.log('Embedding cache hit:', query.substring(0, 30));
    return cached;
  }

  const openai = new OpenAI();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
  });

  const embedding = response.data[0].embedding;

  // Cache the embedding for future use (don't await)
  setCached(EMBEDDING_CACHE_PREFIX, query, embedding, EMBEDDING_CACHE_TTL);

  return embedding;
}

export async function executeSemanticSearch(
  query: string,
  modules?: string[],
  includeDeprecated?: boolean,
  limit: number = 20
): Promise<SearchResult[]> {
  // Check if OpenAI is available
  if (!process.env.OPENAI_API_KEY) {
    return [];
  }

  // Generate cache key based on all parameters
  const cacheKey = `${query}:${modules?.join(',') || 'all'}:${includeDeprecated || false}:${limit}`;

  // Check cache for full search results
  const cachedResults = await getCached<SearchResult[]>(SEMANTIC_CACHE_PREFIX, cacheKey);
  if (cachedResults) {
    console.log('Semantic search cache hit:', query.substring(0, 30));
    return cachedResults;
  }

  try {
    // Get embedding (uses cache when available)
    const queryEmbedding = await getQueryEmbedding(query);
    if (!queryEmbedding) {
      return [];
    }
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Build dynamic WHERE conditions
    let whereConditions = 'embedding IS NOT NULL';

    if (!includeDeprecated) {
      whereConditions += ' AND is_deprecated = false';
    }

    if (modules && modules.length > 0) {
      const moduleList = modules.map((m) => `'${m.replace(/'/g, "''")}'`).join(',');
      whereConditions += ` AND module IN (${moduleList})`;
    }

    // Execute vector similarity search using cosine distance
    const results = await prisma.$queryRawUnsafe<
      {
        id: number;
        tcode: string;
        program: string | null;
        description: string | null;
        module: string | null;
        is_deprecated: boolean;
        similarity: number;
      }[]
    >(
      `SELECT
        id,
        tcode,
        program,
        description,
        module,
        is_deprecated,
        1 - (embedding <=> '${embeddingStr}'::vector) as similarity
      FROM transaction_codes
      WHERE ${whereConditions}
      ORDER BY embedding <=> '${embeddingStr}'::vector
      LIMIT ${limit}`
    );

    const searchResults = results.map((r) => ({
      tcode: r.tcode,
      program: r.program,
      description: r.description,
      module: r.module,
      relevanceScore: Math.max(0, Math.min(1, r.similarity)),
      matchType: 'semantic' as const,
      isDeprecated: r.is_deprecated,
    }));

    // Cache the results (don't await)
    setCached(SEMANTIC_CACHE_PREFIX, cacheKey, searchResults, SEMANTIC_CACHE_TTL);

    return searchResults;
  } catch (error) {
    console.error('Semantic search error:', error);
    return [];
  }
}
