import type { AISearchResult } from '@/types';
import { searchGoogleForTCodes } from './google-search';
import { performDeepGPTAnalysis, deepAnalysisToAIResults } from './deep-gpt-analysis';
import prisma from '@/lib/db';

// Configuration
const DEFAULT_CONFIDENCE_THRESHOLD = 0.8; // Trigger when top confidence < 80%
const OVERALL_TIMEOUT_MS = 10000; // 10 seconds max for entire enhancement (reduced from 15s)
const WEB_RESULT_CONFIDENCE = 0.78; // Confidence for web-validated results

export interface EnhancementMetrics {
  googleSearchUsed: boolean;
  braveSearchUsed: boolean;
  deepGPTUsed: boolean;
  tcodesFromGoogle: number;
  tcodesFromBrave: number;
  tcodesFromGPT: number;
  validatedTCodes: number;
  processingTimeMs: number;
}

export interface EnhancedFallbackResult {
  results: AISearchResult[];
  enhancementUsed: 'none' | 'google' | 'brave' | 'deep-gpt' | 'combined';
  enhancementDetails: EnhancementMetrics | null;
}

/**
 * Fetch Brave search results (extracted from web-search.ts for reuse)
 */
async function fetchBraveSearch(query: string): Promise<string> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    console.log('Brave Search API key not configured');
    return '';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': apiKey,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Brave Search API error:', response.status, response.statusText);
      return '';
    }

    const data = await response.json();
    const webResults = data.web?.results || [];
    return webResults
      .slice(0, 5)
      .map((r: { title?: string; description?: string }) => `${r.title || ''} ${r.description || ''}`)
      .join(' ');
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Brave search timed out');
    } else {
      console.error('Brave search error:', error);
    }
    return '';
  }
}

/**
 * Extract T-codes from text
 */
function extractTCodes(text: string): string[] {
  const FILTER_WORDS = new Set([
    'SAP', 'RFC', 'BAPI', 'THE', 'FOR', 'AND', 'WITH', 'THIS', 'THAT',
    'FROM', 'INTO', 'USING', 'USED', 'WHEN', 'WHERE', 'WHICH', 'WHAT',
    'HOW', 'WHY', 'CAN', 'WILL', 'ALL', 'ANY', 'NOT', 'BUT', 'ARE',
  ]);

  const tcodePattern = /\b([A-Z][A-Z0-9_\/]{1,19})\b/g;
  const matches = text.match(tcodePattern) || [];

  const uniqueTCodes = new Set<string>();
  for (const match of matches) {
    const upper = match.toUpperCase();
    if (upper.length >= 2 && !FILTER_WORDS.has(upper)) {
      uniqueTCodes.add(upper);
    }
  }

  return Array.from(uniqueTCodes);
}

/**
 * Validate T-codes against the database
 */
async function validateTCodes(tcodes: string[]): Promise<AISearchResult[]> {
  if (tcodes.length === 0) return [];

  const validTcodes = await prisma.transactionCode.findMany({
    where: {
      tcode: { in: tcodes },
      isDeprecated: false,
    },
    select: {
      tcode: true,
      description: true,
      module: true,
    },
    take: 10,
  });

  return validTcodes.map((tc) => ({
    tcode: tc.tcode,
    description: tc.description,
    module: tc.module,
    explanation: 'Identified through enhanced search - commonly referenced in SAP documentation.',
    confidence: WEB_RESULT_CONFIDENCE,
    source: 'web' as const,
  }));
}

/**
 * Determine the type of enhancement used
 */
function determineEnhancementType(
  googleTCodes: number,
  braveTCodes: number,
  gptTCodes: number
): 'none' | 'google' | 'brave' | 'deep-gpt' | 'combined' {
  const sources = [
    googleTCodes > 0 ? 'google' : null,
    braveTCodes > 0 ? 'brave' : null,
    gptTCodes > 0 ? 'deep-gpt' : null,
  ].filter(Boolean);

  if (sources.length === 0) return 'none';
  if (sources.length === 1) return sources[0] as 'google' | 'brave' | 'deep-gpt';
  return 'combined';
}

/**
 * Merge and re-rank results from all sources
 */
function mergeAndRankResults(
  existingResults: AISearchResult[],
  webValidatedResults: AISearchResult[],
  gptResults: AISearchResult[]
): AISearchResult[] {
  const resultMap = new Map<string, AISearchResult>();

  // Add existing results first (preserve their scores)
  for (const result of existingResults) {
    resultMap.set(result.tcode, result);
  }

  // Add web-validated results (may boost or replace existing)
  for (const result of webValidatedResults) {
    const existing = resultMap.get(result.tcode);
    if (existing) {
      // Boost existing result if found in web search
      resultMap.set(result.tcode, {
        ...existing,
        confidence: Math.min(0.95, existing.confidence * 1.15), // 15% boost, max 0.95
        explanation: existing.explanation + ' (verified through enhanced search)',
      });
    } else {
      resultMap.set(result.tcode, result);
    }
  }

  // Add GPT suggestions (lower priority, only if not already present)
  for (const result of gptResults) {
    if (!resultMap.has(result.tcode)) {
      // Cap GPT suggestions at 0.75 since they're not database-validated
      resultMap.set(result.tcode, {
        ...result,
        confidence: Math.min(0.75, result.confidence),
      });
    }
  }

  // Sort by confidence (highest first)
  return Array.from(resultMap.values()).sort((a, b) => b.confidence - a.confidence);
}

/**
 * Enhanced low-confidence fallback using Google Search, Brave Search, and Deep GPT Analysis
 * Triggered when the top confidence score is below the threshold (default 80%)
 */
export async function enhancedLowConfidenceFallback(
  query: string,
  existingResults: AISearchResult[],
  confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): Promise<EnhancedFallbackResult> {
  const topConfidence = existingResults[0]?.confidence ?? 0;

  // Check if enhancement is needed
  if (topConfidence >= confidenceThreshold) {
    return {
      results: existingResults,
      enhancementUsed: 'none',
      enhancementDetails: null,
    };
  }

  console.log(
    `Enhanced fallback triggered: top confidence ${(topConfidence * 100).toFixed(0)}% < ${(confidenceThreshold * 100).toFixed(0)}%`
  );

  const startTime = Date.now();

  // Overall timeout wrapper
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), OVERALL_TIMEOUT_MS)
  );

  try {
    // Run all enhancement sources in parallel
    const enhancementPromise = (async () => {
      const webQuery = `SAP transaction code ${query}`;

      const [googleResult, braveContent, deepAnalysis] = await Promise.allSettled([
        // Google Search via SerpAPI
        process.env.SERPAPI_API_KEY
          ? searchGoogleForTCodes(query)
          : Promise.resolve({ tcodes: [], rawContent: '', results: [] }),

        // Brave Search (existing)
        fetchBraveSearch(webQuery),

        // Deep GPT Analysis
        performDeepGPTAnalysis(query, existingResults, ''),
      ]);

      return { googleResult, braveContent, deepAnalysis };
    })();

    // Race between enhancement and timeout
    const result = await Promise.race([enhancementPromise, timeoutPromise]);

    if (!result) {
      console.log('Enhanced fallback timed out');
      return {
        results: existingResults,
        enhancementUsed: 'none',
        enhancementDetails: {
          googleSearchUsed: false,
          braveSearchUsed: false,
          deepGPTUsed: false,
          tcodesFromGoogle: 0,
          tcodesFromBrave: 0,
          tcodesFromGPT: 0,
          validatedTCodes: 0,
          processingTimeMs: Date.now() - startTime,
        },
      };
    }

    // Extract results from settled promises
    const googleResults =
      result.googleResult.status === 'fulfilled' ? result.googleResult.value.results : [];
    const googleTCodes =
      result.googleResult.status === 'fulfilled' ? result.googleResult.value.tcodes : [];

    const braveContent =
      result.braveContent.status === 'fulfilled' ? result.braveContent.value : '';
    const braveTCodes = extractTCodes(braveContent);

    const deepGPTResults =
      result.deepAnalysis.status === 'fulfilled' && result.deepAnalysis.value
        ? deepAnalysisToAIResults(result.deepAnalysis.value)
        : [];

    // Validate Brave T-codes against database
    const braveValidated = await validateTCodes(braveTCodes);

    // Merge Google validated results with Brave validated results
    const allWebValidated = [...googleResults, ...braveValidated];

    // Deduplicate web results by T-code
    const webResultMap = new Map<string, AISearchResult>();
    for (const r of allWebValidated) {
      if (!webResultMap.has(r.tcode)) {
        webResultMap.set(r.tcode, r);
      }
    }
    const uniqueWebResults = Array.from(webResultMap.values());

    // Merge all results
    const mergedResults = mergeAndRankResults(existingResults, uniqueWebResults, deepGPTResults);

    const processingTimeMs = Date.now() - startTime;
    const enhancementUsed = determineEnhancementType(
      googleResults.length,
      braveValidated.length,
      deepGPTResults.length
    );

    console.log(
      `Enhanced fallback completed in ${processingTimeMs}ms: ` +
        `Google=${googleResults.length}, Brave=${braveValidated.length}, GPT=${deepGPTResults.length}`
    );

    return {
      results: mergedResults,
      enhancementUsed,
      enhancementDetails: {
        googleSearchUsed: googleResults.length > 0,
        braveSearchUsed: braveValidated.length > 0,
        deepGPTUsed: deepGPTResults.length > 0,
        tcodesFromGoogle: googleTCodes.length,
        tcodesFromBrave: braveTCodes.length,
        tcodesFromGPT: deepGPTResults.length,
        validatedTCodes: uniqueWebResults.length,
        processingTimeMs,
      },
    };
  } catch (error) {
    console.error('Enhanced fallback error:', error);
    return {
      results: existingResults,
      enhancementUsed: 'none',
      enhancementDetails: {
        googleSearchUsed: false,
        braveSearchUsed: false,
        deepGPTUsed: false,
        tcodesFromGoogle: 0,
        tcodesFromBrave: 0,
        tcodesFromGPT: 0,
        validatedTCodes: 0,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }
}
