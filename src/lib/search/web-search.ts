import prisma from '@/lib/db';
import type { AISearchResult } from '@/types';

const WEB_SEARCH_TIMEOUT_MS = 5000;

// Common words to filter out from T-code extraction
const FILTER_WORDS = new Set([
  'SAP', 'RFC', 'BAPI', 'THE', 'FOR', 'AND', 'WITH', 'THIS', 'THAT',
  'FROM', 'INTO', 'USING', 'USED', 'WHEN', 'WHERE', 'WHICH', 'WHAT',
  'HOW', 'WHY', 'CAN', 'WILL', 'ALL', 'ANY', 'NOT', 'BUT', 'ARE',
  'WAS', 'WERE', 'BEEN', 'HAVE', 'HAS', 'HAD', 'DOES', 'DID', 'GET',
  'USE', 'YOU', 'YOUR', 'NEW', 'OLD', 'SET', 'RUN', 'CODE', 'DATA',
  'TYPE', 'NAME', 'USER', 'STEP', 'MENU', 'LIST', 'VIEW', 'EDIT',
  'SAVE', 'DELETE', 'CREATE', 'UPDATE', 'DISPLAY', 'CHANGE', 'ENTER',
  'SELECT', 'OPTION', 'TABLE', 'FIELD', 'VALUE', 'TEXT', 'LINE',
  'ITEM', 'NUMBER', 'DATE', 'TIME', 'STANDARD', 'CUSTOM', 'REPORT',
  'PROGRAM', 'FUNCTION', 'MODULE', 'OBJECT', 'CLASS', 'METHOD',
  'INTERFACE', 'TRANSACTION', 'SCREEN', 'DIALOG', 'BATCH', 'PROCESS',
]);

/**
 * Extract potential T-codes from text
 * T-codes are typically uppercase alphanumeric strings with optional underscores
 * Length is usually 2-20 characters
 */
function extractTCodes(text: string): string[] {
  // Pattern for SAP T-codes: uppercase letters/numbers, may contain underscore or slash
  const tcodePattern = /\b([A-Z][A-Z0-9_\/]{1,19})\b/g;
  const matches = text.match(tcodePattern) || [];

  // Filter and deduplicate
  const uniqueTCodes = new Set<string>();
  for (const match of matches) {
    const upper = match.toUpperCase();
    // Filter out common words and too short matches
    if (upper.length >= 2 && !FILTER_WORDS.has(upper)) {
      uniqueTCodes.add(upper);
    }
  }

  return Array.from(uniqueTCodes);
}

/**
 * Fetch web search results using Brave Search API
 * Falls back to empty array if API key is not configured
 */
async function fetchBraveSearch(query: string): Promise<string> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    console.log('Brave Search API key not configured');
    return '';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEB_SEARCH_TIMEOUT_MS);

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          'Accept': 'application/json',
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

    // Combine titles and descriptions from top results
    const webResults = data.web?.results || [];
    return webResults
      .slice(0, 5)
      .map((r: { title?: string; description?: string }) =>
        `${r.title || ''} ${r.description || ''}`
      )
      .join(' ');
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Web search timed out');
    } else {
      console.error('Web search error:', error);
    }
    return '';
  }
}

/**
 * Validate T-codes against the database and get full details
 */
async function validateAndFetchTCodes(tcodes: string[]): Promise<AISearchResult[]> {
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
      subModule: true,
    },
    take: 10,
  });

  return validTcodes.map((tc) => ({
    tcode: tc.tcode,
    description: tc.description,
    module: tc.module,
    explanation: 'Found via web search - commonly mentioned in SAP documentation and forums.',
    confidence: 0.75, // Web-validated confidence
    source: 'web' as const,
  }));
}

/**
 * Enhance search results with web search when confidence is low
 * This function is called when the best AI search result has confidence < threshold
 */
export async function enhanceWithWebSearch(
  query: string,
  existingResults: AISearchResult[],
  confidenceThreshold: number = 0.6
): Promise<{ results: AISearchResult[]; webFallbackUsed: boolean }> {
  // Check if enhancement is needed
  const topConfidence = existingResults[0]?.confidence ?? 0;

  if (topConfidence >= confidenceThreshold) {
    return { results: existingResults, webFallbackUsed: false };
  }

  console.log(`Web fallback triggered: top confidence ${topConfidence.toFixed(2)} < ${confidenceThreshold}`);

  // Perform web search
  const webQuery = `SAP transaction code ${query}`;
  const webContent = await fetchBraveSearch(webQuery);

  if (!webContent) {
    console.log('Web search returned no content');
    return { results: existingResults, webFallbackUsed: false };
  }

  // Extract potential T-codes from web content
  const extractedTCodes = extractTCodes(webContent);
  console.log(`Extracted ${extractedTCodes.length} potential T-codes from web:`, extractedTCodes.slice(0, 10));

  // Validate against database
  const webResults = await validateAndFetchTCodes(extractedTCodes);
  console.log(`Validated ${webResults.length} T-codes from database`);

  if (webResults.length === 0) {
    return { results: existingResults, webFallbackUsed: false };
  }

  // Merge results: web results first, then existing results (deduplicated)
  const resultMap = new Map<string, AISearchResult>();

  // Add web results first (higher priority)
  for (const result of webResults) {
    resultMap.set(result.tcode, result);
  }

  // Add existing results (don't overwrite web results)
  for (const result of existingResults) {
    if (!resultMap.has(result.tcode)) {
      resultMap.set(result.tcode, result);
    }
  }

  // Convert to array and sort by confidence
  const mergedResults = Array.from(resultMap.values())
    .sort((a, b) => b.confidence - a.confidence);

  return { results: mergedResults, webFallbackUsed: true };
}
