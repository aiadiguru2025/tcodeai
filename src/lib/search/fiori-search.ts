import prisma from '@/lib/db';
import OpenAI from 'openai';
import type { FioriSearchResult } from '@/types';

const openai = new OpenAI();
const EMBEDDING_MODEL = 'text-embedding-3-small';

interface FioriAppRow {
  id: number;
  app_id: string;
  app_name: string;
  app_launcher_title: string | null;
  ui_technology: string;
  app_component_desc: string | null;
  line_of_business: string[];
  semantic_object_action: string[];
  business_catalog_title: string | null;
  product_version: string | null;
  created_at: Date;
  similarity?: number;
}

/**
 * Search Fiori apps by text query (fuzzy search)
 */
export async function searchFioriAppsFuzzy(
  query: string,
  limit: number = 20
): Promise<FioriSearchResult[]> {
  const apps = await prisma.fioriApp.findMany({
    where: {
      OR: [
        { appId: { contains: query, mode: 'insensitive' } },
        { appName: { contains: query, mode: 'insensitive' } },
        { appLauncherTitle: { contains: query, mode: 'insensitive' } },
        { appComponentDesc: { contains: query, mode: 'insensitive' } },
        { businessCatalogTitle: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { appName: 'asc' },
  });

  return apps.map((app) => ({
    id: app.id,
    appId: app.appId,
    appName: app.appName,
    appLauncherTitle: app.appLauncherTitle,
    uiTechnology: app.uiTechnology,
    appComponentDesc: app.appComponentDesc,
    lineOfBusiness: app.lineOfBusiness,
    semanticObjectAction: app.semanticObjectAction,
    businessCatalogTitle: app.businessCatalogTitle,
    productVersion: app.productVersion,
    createdAt: app.createdAt,
    relevanceScore: 0.8,
    matchType: 'fuzzy' as const,
  }));
}

/**
 * Search Fiori apps using semantic similarity
 */
export async function searchFioriAppsSemantic(
  query: string,
  limit: number = 20
): Promise<FioriSearchResult[]> {
  // Generate embedding for query
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
  });

  const queryEmbedding = embeddingResponse.data[0].embedding;
  const embeddingStr = JSON.stringify(queryEmbedding);

  // Search using vector similarity
  const results = await prisma.$queryRaw<FioriAppRow[]>`
    SELECT
      id, app_id, app_name, app_launcher_title, ui_technology,
      app_component_desc, line_of_business, semantic_object_action,
      business_catalog_title, product_version, created_at,
      1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM fiori_apps
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `;

  return results.map((app) => ({
    id: app.id,
    appId: app.app_id,
    appName: app.app_name,
    appLauncherTitle: app.app_launcher_title,
    uiTechnology: app.ui_technology,
    appComponentDesc: app.app_component_desc,
    lineOfBusiness: app.line_of_business,
    semanticObjectAction: app.semantic_object_action,
    businessCatalogTitle: app.business_catalog_title,
    productVersion: app.product_version,
    createdAt: app.created_at,
    relevanceScore: app.similarity || 0,
    matchType: 'semantic' as const,
  }));
}

/**
 * Hybrid search combining fuzzy and semantic search
 */
export async function searchFioriAppsHybrid(
  query: string,
  options: {
    limit?: number;
    tech?: string;
    enableSemantic?: boolean;
  } = {}
): Promise<FioriSearchResult[]> {
  const { limit = 20, tech, enableSemantic = true } = options;
  const results: Map<string, FioriSearchResult> = new Map();

  // Run fuzzy search
  const fuzzyResults = await searchFioriAppsFuzzy(query, limit);
  for (const result of fuzzyResults) {
    if (!tech || result.uiTechnology === tech) {
      results.set(result.appId, result);
    }
  }

  // Run semantic search if enabled and query looks like natural language
  if (enableSemantic && query.includes(' ') && query.length > 5) {
    try {
      const semanticResults = await searchFioriAppsSemantic(query, limit);
      for (const result of semanticResults) {
        if (!tech || result.uiTechnology === tech) {
          const existing = results.get(result.appId);
          if (existing) {
            // Boost score for apps found in both searches
            existing.relevanceScore = Math.min(1, existing.relevanceScore * 1.3);
          } else {
            results.set(result.appId, result);
          }
        }
      }
    } catch (error) {
      console.error('Semantic search error:', error);
      // Continue with fuzzy results only
    }
  }

  // Sort by relevance and return
  return Array.from(results.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}
