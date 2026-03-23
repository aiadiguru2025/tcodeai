import OpenAI from 'openai';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { getCached, setCached } from '@/lib/cache';
import { debugLog, validateEmbedding, embeddingToSqlString } from '@/lib/utils';
import type { SearchResult } from '@/types';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_CACHE_PREFIX = 'embed';
const SEMANTIC_CACHE_PREFIX = 'semantic';
const EMBEDDING_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days for embeddings
const SEMANTIC_CACHE_TTL = 60 * 60 * 4; // 4 hours for full search results

/**
 * Get embedding for a query, using cache when available
 */
export async function getQueryEmbedding(query: string): Promise<number[] | null> {
  // Check embedding cache first
  const cached = await getCached<number[]>(EMBEDDING_CACHE_PREFIX, query);
  if (cached) {
    debugLog('Embedding cache hit:', query.substring(0, 30));
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
    debugLog('Semantic search cache hit:', query.substring(0, 30));
    return cachedResults;
  }

  try {
    // Get embedding (uses cache when available)
    const queryEmbedding = await getQueryEmbedding(query);
    if (!queryEmbedding || !validateEmbedding(queryEmbedding)) {
      return [];
    }
    const embeddingStr = embeddingToSqlString(queryEmbedding);

    // Build dynamic WHERE conditions using parameterized queries (prevents SQL injection)
    let whereClause = Prisma.sql`embedding IS NOT NULL`;

    if (!includeDeprecated) {
      whereClause = Prisma.sql`${whereClause} AND is_deprecated = false`;
    }

    if (modules && modules.length > 0) {
      whereClause = Prisma.sql`${whereClause} AND module IN (${Prisma.join(modules)})`;
    }

    // Set HNSW search parameters for faster approximate search
    await prisma.$executeRaw`SET hnsw.ef_search = 40`;

    // Execute vector similarity search using cosine distance with HNSW index
    const results = await prisma.$queryRaw<
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
      Prisma.sql`SELECT
        id,
        tcode,
        program,
        description,
        module,
        is_deprecated,
        1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM transaction_codes
      WHERE ${whereClause}
      ORDER BY embedding <=> ${embeddingStr}::vector
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
    console.error('Semantic search error:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}
