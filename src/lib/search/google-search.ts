import type { AISearchResult } from '@/types';
import prisma from '@/lib/db';

const GOOGLE_SEARCH_TIMEOUT_MS = 5000;

// Common words to filter out from T-code extraction (same as web-search.ts)
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

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface SerpAPIResponse {
  organic_results?: GoogleSearchResult[];
  error?: string;
}

/**
 * Extract potential T-codes from text
 */
export function extractTCodes(text: string): string[] {
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
 * Fetch Google search results via SerpAPI
 */
export async function fetchGoogleSearch(query: string): Promise<GoogleSearchResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    console.log('SerpAPI key not configured');
    return [];
  }

  const searchQuery = `SAP transaction code ${query}`;
  const url = new URL('https://serpapi.com/search');
  url.searchParams.set('q', searchQuery);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('engine', 'google');
  url.searchParams.set('num', '10');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GOOGLE_SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('SerpAPI error:', response.status, response.statusText);
      return [];
    }

    const data: SerpAPIResponse = await response.json();

    if (data.error) {
      console.error('SerpAPI error:', data.error);
      return [];
    }

    return data.organic_results || [];
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Google search timed out');
    } else {
      console.error('Google search error:', error);
    }
    return [];
  }
}

/**
 * Extract T-codes from Google search results
 */
export function extractTCodesFromGoogleResults(results: GoogleSearchResult[]): string[] {
  const allText = results
    .map((r) => `${r.title} ${r.snippet}`)
    .join(' ');

  return extractTCodes(allText);
}

/**
 * Validate T-codes against the database and get full details
 */
export async function validateAndFetchTCodes(tcodes: string[]): Promise<AISearchResult[]> {
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
    explanation: 'Found via Google search - commonly mentioned in SAP documentation and forums.',
    confidence: 0.78, // Slightly higher than Brave (0.75) due to better coverage
    source: 'web' as const,
  }));
}

/**
 * Search Google for T-codes related to a query
 * Returns extracted T-codes and raw content for further analysis
 */
export async function searchGoogleForTCodes(
  query: string
): Promise<{ tcodes: string[]; rawContent: string; results: AISearchResult[] }> {
  const googleResults = await fetchGoogleSearch(query);

  if (googleResults.length === 0) {
    return { tcodes: [], rawContent: '', results: [] };
  }

  const rawContent = googleResults
    .map((r) => `${r.title} ${r.snippet}`)
    .join(' ');

  const extractedTCodes = extractTCodesFromGoogleResults(googleResults);
  console.log(`Google: Extracted ${extractedTCodes.length} potential T-codes:`, extractedTCodes.slice(0, 10));

  const validatedResults = await validateAndFetchTCodes(extractedTCodes);
  console.log(`Google: Validated ${validatedResults.length} T-codes from database`);

  return {
    tcodes: extractedTCodes,
    rawContent,
    results: validatedResults,
  };
}
