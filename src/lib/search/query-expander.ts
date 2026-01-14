import OpenAI from 'openai';
import { getCached, setCached } from '@/lib/cache';

const CACHE_PREFIX = 'query-expand';
const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days
const EXPANSION_TIMEOUT_MS = 3000; // 3 seconds max

/**
 * Create a timeout promise
 */
function timeout<T>(ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fallback), ms));
}

/**
 * Expand a user query with SAP-specific synonyms and abbreviations.
 * Uses GPT to understand context and add relevant SAP terms.
 * Results are cached for 7 days.
 */
export async function expandQueryWithSAPTerms(query: string): Promise<string> {
  // Check cache first
  const cached = await getCached<string>(CACHE_PREFIX, query);
  if (cached) {
    console.log('Query expansion cache hit:', query.substring(0, 30));
    return cached;
  }

  if (!process.env.OPENAI_API_KEY) {
    return query; // Fallback to original query
  }

  const openai = new OpenAI();

  const expansionPromise = openai.chat.completions
    .create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an SAP expert. Expand the user's search query with SAP-specific synonyms and abbreviations.

Rules:
1. Add SAP abbreviations (G/L = GL = General Ledger, PO = Purchase Order, etc.)
2. Add likely T-code prefixes if known (FB for FI postings, ME for MM, VA for SD, SE for BASIS)
3. Add business context terms and common SAP terminology
4. Keep response under 80 words
5. Return ONLY the expanded query as plain text, no explanation or formatting

Example:
Input: "make G/L posting"
Output: "G/L posting general ledger GL account posting journal entry FB50 FI financial single screen document"

Input: "display dictionary table"
Output: "dictionary table display data browser SE16 SE16N SE16H table contents ABAP dictionary database view"

Input: "create purchase order"
Output: "create purchase order PO ME21N procurement MM materials management purchasing vendor"`,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    })
    .then((response) => response.choices[0]?.message?.content || query)
    .catch((err) => {
      console.error('Query expansion error:', err);
      return query;
    });

  // Race between expansion and timeout
  const expanded = await Promise.race([expansionPromise, timeout(EXPANSION_TIMEOUT_MS, query)]);

  // Cache the expansion (don't await)
  if (expanded !== query) {
    setCached(CACHE_PREFIX, query, expanded, CACHE_TTL);
  }

  console.log('Query expanded:', query, '->', expanded.substring(0, 60) + '...');
  return expanded;
}
