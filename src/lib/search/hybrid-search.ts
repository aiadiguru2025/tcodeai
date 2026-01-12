import prisma from '@/lib/db';
import type { SearchResult } from '@/types';

interface SearchOptions {
  query: string;
  modules?: string[];
  limit?: number;
  includeDeprecated?: boolean;
}

export async function hybridSearch(options: SearchOptions): Promise<SearchResult[]> {
  const { query, modules, limit = 20, includeDeprecated = false } = options;
  const normalizedQuery = query.trim().toLowerCase();

  // Execute all search strategies in parallel
  const [exactResults, fuzzyResults, ftsResults] = await Promise.all([
    executeExactSearch(normalizedQuery, modules, includeDeprecated),
    executeFuzzySearch(normalizedQuery, modules, includeDeprecated),
    executeFullTextSearch(query, modules, includeDeprecated),
  ]);

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

  // Sort by relevance and return top results
  return Array.from(resultMap.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
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
  // Build the search query - split into words for better matching
  const words = query
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((w) => w.toLowerCase());

  if (words.length === 0) {
    return [];
  }

  // Build conditions for each word
  const wordConditions = words.map((word) => ({
    OR: [
      { description: { contains: word, mode: 'insensitive' as const } },
      { descriptionEnriched: { contains: word, mode: 'insensitive' as const } },
      { tcode: { contains: word, mode: 'insensitive' as const } },
    ],
  }));

  const whereClause: Record<string, unknown> = {
    AND: wordConditions,
  };

  if (modules && modules.length > 0) {
    whereClause.module = { in: modules };
  }

  if (!includeDeprecated) {
    whereClause.isDeprecated = false;
  }

  const results = await prisma.transactionCode.findMany({
    where: whereClause,
    take: 30,
  });

  return results.map((r) => {
    // Calculate relevance based on how many words match
    const text = `${r.tcode} ${r.description || ''} ${r.descriptionEnriched || ''}`.toLowerCase();
    const matchedWords = words.filter((w) => text.includes(w));
    const score = (matchedWords.length / words.length) * 0.8;

    return {
      tcode: r.tcode,
      program: r.program,
      description: r.description || r.descriptionEnriched,
      module: r.module,
      relevanceScore: Math.max(0.1, score),
      matchType: 'fulltext' as const,
      isDeprecated: r.isDeprecated,
    };
  });
}
