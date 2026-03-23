import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import type { SearchResult } from '@/types';
import { executeSemanticSearch } from './semantic-search';
import { getCached, setCached } from '@/lib/cache';
import { applyFeedbackBoost } from './feedback-ranking';
import { debugLog } from '@/lib/utils';

const HYBRID_CACHE_PREFIX = 'hybrid';
const HYBRID_CACHE_TTL = 60 * 60 * 2; // 2 hours for hybrid search results

interface SearchOptions {
  query: string;
  modules?: string[];
  limit?: number;
  includeDeprecated?: boolean;
  enableSemantic?: boolean;
}

export async function hybridSearch(options: SearchOptions): Promise<SearchResult[]> {
  const { query, modules, limit = 20, includeDeprecated = false, enableSemantic = true } = options;
  const normalizedQuery = query.trim().toLowerCase();

  // Generate cache key
  const cacheKey = `${normalizedQuery}:${modules?.join(',') || 'all'}:${limit}:${includeDeprecated}:${enableSemantic}`;

  // Check cache first
  const cached = await getCached<SearchResult[]>(HYBRID_CACHE_PREFIX, cacheKey);
  if (cached) {
    debugLog('Hybrid search cache hit:', query.substring(0, 30));
    return cached;
  }

  // Determine if this looks like a natural language query vs a T-code search
  const isNaturalLanguage = query.includes(' ') && query.length > 5;

  // Execute search strategies in parallel
  const searchPromises: Promise<SearchResult[]>[] = [
    executeExactSearch(normalizedQuery, modules, includeDeprecated),
    executeFuzzySearch(normalizedQuery, modules, includeDeprecated),
    executeFullTextSearch(query, modules, includeDeprecated),
  ];

  // Add semantic search for natural language queries if embeddings exist
  if (enableSemantic && isNaturalLanguage && process.env.OPENAI_API_KEY) {
    searchPromises.push(executeSemanticSearch(query, modules, includeDeprecated, 15));
  }

  const [exactResults, fuzzyResults, ftsResults, semanticResults = []] =
    await Promise.all(searchPromises);

  // Merge and deduplicate results
  const resultMap = new Map<string, SearchResult>();

  // Exact matches get highest priority
  for (const result of exactResults) {
    resultMap.set(result.tcode, { ...result, relevanceScore: 1.0 });
  }

  // Fuzzy matches
  for (const result of fuzzyResults) {
    if (!resultMap.has(result.tcode)) {
      resultMap.set(result.tcode, result);
    } else {
      const existing = resultMap.get(result.tcode)!;
      if (result.relevanceScore > existing.relevanceScore) {
        resultMap.set(result.tcode, result);
      }
    }
  }

  // Full-text search results
  for (const result of ftsResults) {
    if (!resultMap.has(result.tcode)) {
      resultMap.set(result.tcode, result);
    } else {
      const existing = resultMap.get(result.tcode)!;
      // Boost score if found in multiple searches
      existing.relevanceScore = Math.min(1.0, existing.relevanceScore * 1.2);
    }
  }

  // Semantic search results (weighted slightly lower if already found)
  for (const result of semanticResults) {
    if (!resultMap.has(result.tcode)) {
      resultMap.set(result.tcode, result);
    } else {
      const existing = resultMap.get(result.tcode)!;
      // Boost score significantly if also found by semantic search
      existing.relevanceScore = Math.min(1.0, existing.relevanceScore * 1.3);
    }
  }

  // Apply feedback-based ranking boost
  const resultsWithFeedback = await applyFeedbackBoost(Array.from(resultMap.values()));

  // Sort by relevance and return top results
  const results = resultsWithFeedback
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  // Cache the results
  setCached(HYBRID_CACHE_PREFIX, cacheKey, results, HYBRID_CACHE_TTL);

  return results;
}

async function executeExactSearch(
  query: string,
  modules?: string[],
  includeDeprecated?: boolean
): Promise<SearchResult[]> {
  const upperQuery = query.toUpperCase();

  const whereClause: Record<string, unknown> = {
    tcode: {
      equals: upperQuery,
      mode: 'insensitive',
    },
  };

  if (modules && modules.length > 0) {
    whereClause.module = { in: modules };
  }

  if (!includeDeprecated) {
    whereClause.isDeprecated = false;
  }

  const results = await prisma.transactionCode.findMany({
    where: whereClause,
    select: {
      tcode: true,
      program: true,
      description: true,
      descriptionEnriched: true,
      module: true,
      isDeprecated: true,
    },
    take: 5,
  });

  return results.map((r) => ({
    tcode: r.tcode,
    program: r.program,
    description: r.description || r.descriptionEnriched,
    module: r.module,
    relevanceScore: 1.0,
    matchType: 'exact' as const,
    isDeprecated: r.isDeprecated,
  }));
}

async function executeFuzzySearch(
  query: string,
  modules?: string[],
  includeDeprecated?: boolean
): Promise<SearchResult[]> {
  const upperQuery = query.toUpperCase();

  // Use LIKE for prefix matching and contains
  const whereClause: Record<string, unknown> = {
    OR: [
      { tcode: { startsWith: upperQuery, mode: 'insensitive' } },
      { tcode: { contains: upperQuery, mode: 'insensitive' } },
    ],
  };

  if (modules && modules.length > 0) {
    whereClause.module = { in: modules };
  }

  if (!includeDeprecated) {
    whereClause.isDeprecated = false;
  }

  const results = await prisma.transactionCode.findMany({
    where: whereClause,
    select: {
      tcode: true,
      program: true,
      description: true,
      descriptionEnriched: true,
      module: true,
      isDeprecated: true,
    },
    take: 20,
    orderBy: { tcode: 'asc' },
  });

  return results.map((r) => {
    // Calculate similarity score
    const tcodeUpper = r.tcode.toUpperCase();
    let score = 0.5;

    if (tcodeUpper === upperQuery) {
      score = 1.0;
    } else if (tcodeUpper.startsWith(upperQuery)) {
      score = 0.9 - (tcodeUpper.length - upperQuery.length) * 0.02;
    } else if (tcodeUpper.includes(upperQuery)) {
      score = 0.7 - (tcodeUpper.length - upperQuery.length) * 0.02;
    }

    return {
      tcode: r.tcode,
      program: r.program,
      description: r.description || r.descriptionEnriched,
      module: r.module,
      relevanceScore: Math.max(0.1, score),
      matchType: 'fuzzy' as const,
      isDeprecated: r.isDeprecated,
    };
  });
}

async function executeFullTextSearch(
  query: string,
  modules?: string[],
  includeDeprecated?: boolean
): Promise<SearchResult[]> {
  const words = query
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (words.length === 0) {
    return [];
  }

  // Use PostgreSQL full-text search with the pre-computed search_vector column
  // This uses the GIN index and is orders of magnitude faster than LIKE '%word%'
  const tsQuery = words.map((w) => w.replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean).join(' & ');

  if (!tsQuery) return [];

  let moduleFilter = Prisma.sql``;
  if (modules && modules.length > 0) {
    moduleFilter = Prisma.sql` AND module IN (${Prisma.join(modules)})`;
  }

  let deprecatedFilter = Prisma.sql``;
  if (!includeDeprecated) {
    deprecatedFilter = Prisma.sql` AND is_deprecated = false`;
  }

  const results = await prisma.$queryRaw<
    {
      id: number;
      tcode: string;
      program: string | null;
      description: string | null;
      description_enriched: string | null;
      module: string | null;
      is_deprecated: boolean;
      rank: number;
    }[]
  >(
    Prisma.sql`SELECT id, tcode, program, description, description_enriched, module, is_deprecated,
      ts_rank_cd(search_vector, to_tsquery('english', ${tsQuery})) as rank
    FROM transaction_codes
    WHERE search_vector @@ to_tsquery('english', ${tsQuery})${moduleFilter}${deprecatedFilter}
    ORDER BY rank DESC
    LIMIT 30`
  );

  return results.map((r) => ({
    tcode: r.tcode,
    program: r.program,
    description: r.description || r.description_enriched,
    module: r.module,
    relevanceScore: Math.max(0.1, Math.min(0.8, r.rank)),
    matchType: 'fulltext' as const,
    isDeprecated: r.is_deprecated,
  }));
}
