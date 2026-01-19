import OpenAI from 'openai';
import { executeSemanticSearch } from './semantic-search';
import { expandQueryWithSAPTerms } from './query-expander';
import { validateSearchResults } from './llm-judge';
import { generateAIFallbackSuggestions } from './ai-fallback';
import { enhanceWithWebSearch } from './web-search';
import { applyFeedbackBoostToAI } from './feedback-ranking';
import { applyMolgaBoost, detectCountryInQuery } from './molga-lookup';
import { getCached, setCached } from '@/lib/cache';
import type { AISearchResult } from '@/types';

const WEB_FALLBACK_THRESHOLD = 0.6; // Trigger web search when top confidence is below this

const EXPLANATION_MODEL = 'gpt-4o-mini';
const CACHE_PREFIX = 'ai-search-v2'; // v2: improved term matching ranking
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

  // Check cache first (with error handling)
  const cacheKey = `${query}:${limit}`;
  try {
    const cached = await getCached<AISearchResult[]>(CACHE_PREFIX, cacheKey);
    if (cached) {
      console.log('AI search cache hit:', query);
      // Sort cached results by confidence (older cache entries may not be sorted)
      cached.sort((a, b) => b.confidence - a.confidence);
      return { results: cached, cached: true };
    }
  } catch (cacheError) {
    console.warn('Cache read error, continuing without cache:', cacheError);
  }

  console.log('AI search cache miss:', query);

  // Run query expansion and original semantic search in parallel
  const [expandedQuery, directCandidates] = await Promise.all([
    expandQueryWithSAPTerms(query),
    executeSemanticSearch(query, undefined, false, limit),
  ]);

  // Get additional candidates using expanded query (if different from original)
  let expandedCandidates: Awaited<ReturnType<typeof executeSemanticSearch>> = [];
  if (expandedQuery !== query) {
    expandedCandidates = await executeSemanticSearch(expandedQuery, undefined, false, limit);
  }

  // Merge and deduplicate candidates, prioritizing expanded query results
  const candidateMap = new Map<string, (typeof directCandidates)[0]>();
  for (const c of expandedCandidates) {
    candidateMap.set(c.tcode, c);
  }
  for (const c of directCandidates) {
    if (!candidateMap.has(c.tcode)) {
      candidateMap.set(c.tcode, c);
    }
  }
  const candidates = Array.from(candidateMap.values()).slice(0, limit * 2);

  if (candidates.length === 0) {
    // No database results found - try AI fallback
    console.log('No database candidates found, trying AI fallback for:', query);
    const fallbackResults = await generateAIFallbackSuggestions(query, limit);
    if (fallbackResults.length > 0) {
      console.log(`AI fallback returned ${fallbackResults.length} suggestions`);
      return { results: fallbackResults, cached: false };
    }
    return { results: [], cached: false };
  }

  // Format candidates for the prompt (shorter format)
  const candidateList = candidates
    .map((c) => `${c.tcode}: ${c.description || 'N/A'}`)
    .join('\n');

  // Detect country in query for GPT context (with error handling)
  let countryContext = '';
  try {
    const countryMatches = await detectCountryInQuery(query);
    if (countryMatches.length > 0) {
      countryContext = `\n\nDETECTED COUNTRY: ${countryMatches[0].country} (MOLGA ${countryMatches[0].molga}, pattern: ${countryMatches[0].pattern}). T-codes containing "${countryMatches[0].pattern}" are for this country and MUST rank highest.`;
    }
  } catch (countryError) {
    console.warn('Country detection error, continuing without country context:', countryError);
  }

  // Try to get GPT explanations with timeout
  const openai = new OpenAI();

  const gptPromise = openai.chat.completions
    .create({
      model: EXPLANATION_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an SAP expert ranking T-code search results. Score each T-code's relevance to the user's query.

CRITICAL RANKING RULES:
1. MOLGA COUNTRY CODE IS HIGHEST PRIORITY: SAP uses MOLGA codes in T-codes for country-specific functionality. Format: _M## or M## (e.g., M10=USA, M01=Germany, M44=Finland).
2. If a country is mentioned, T-codes with matching MOLGA pattern MUST get confidence >0.95.
3. T-codes with DIFFERENT MOLGA codes should get <0.5 confidence (wrong country).
4. Generic T-codes without MOLGA patterns should score 0.6-0.8.
5. Common MOLGA codes: M01=Germany, M08=UK, M10=USA, M15=Italy, M22=Japan, M37=Brazil, M40=India, M41=South Korea, M44=Finland.

Output JSON: {"results":[{"tcode":"XX01","explanation":"brief reason","confidence":0.0-1.0}]}`,
        },
        {
          role: 'user',
          content: `Query: "${query}"${countryContext}\n\nCandidates:\n${candidateList}`,
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

  // Apply term-matching boost before sorting
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  results = results.map(r => {
    const descLower = (r.description || '').toLowerCase();
    const tcodeLower = r.tcode.toLowerCase();

    // Check for exact term matches in description or tcode
    let termBoost = 0;
    for (const term of queryTerms) {
      if (descLower.includes(term) || tcodeLower.includes(term)) {
        termBoost += 0.05; // Small boost for each matching term
      }
    }

    // Cap the boost at 0.15 to avoid over-inflating
    termBoost = Math.min(termBoost, 0.15);

    return {
      ...r,
      confidence: Math.min(1, r.confidence + termBoost),
    };
  });

  // Sort results by confidence score (highest first) for accurate "Best Match"
  results.sort((a, b) => b.confidence - a.confidence);

  // Validate results with LLM Judge before caching
  const { results: validatedResults } = await validateSearchResults(query, results);

  // Re-sort after potential confidence adjustments from judge
  validatedResults.sort((a, b) => b.confidence - a.confidence);

  // Enhance with web search if confidence is below threshold
  const { results: enhancedResults, webFallbackUsed } = await enhanceWithWebSearch(
    query,
    validatedResults,
    WEB_FALLBACK_THRESHOLD
  );

  // Re-sort after web enhancement
  if (webFallbackUsed) {
    enhancedResults.sort((a, b) => b.confidence - a.confidence);
    console.log(`Web fallback enhanced results for: ${query}`);
  }

  // Apply MOLGA-based boost for country-specific queries (with error handling)
  let molgaBoostedResults = enhancedResults;
  try {
    const molgaResult = await applyMolgaBoost(enhancedResults, query);
    molgaBoostedResults = molgaResult.results;
    molgaBoostedResults.sort((a, b) => b.confidence - a.confidence);
  } catch (molgaError) {
    console.warn('MOLGA boost error, continuing without boost:', molgaError);
  }

  // Apply feedback-based ranking boost from user votes (with error handling)
  let finalResults = molgaBoostedResults;
  try {
    finalResults = await applyFeedbackBoostToAI(molgaBoostedResults);
    finalResults.sort((a, b) => b.confidence - a.confidence);
  } catch (feedbackError) {
    console.warn('Feedback boost error, continuing without boost:', feedbackError);
  }

  // Store final results in cache (non-blocking, with error handling)
  setCached(CACHE_PREFIX, cacheKey, finalResults, CACHE_TTL).catch((cacheError) => {
    console.warn('Cache write error:', cacheError);
  });

  return { results: finalResults, cached: false };
}
