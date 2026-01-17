import OpenAI from 'openai';
import { getCached, setCached } from '@/lib/cache';
import type { AISearchResult } from '@/types';

const FALLBACK_MODEL = 'gpt-4o-mini';
const CACHE_PREFIX = 'ai-fallback';
const CACHE_TTL = 60 * 60 * 12; // 12 hours (shorter than verified results)
const GPT_TIMEOUT_MS = 10000; // 10 seconds max

// Maximum confidence for AI-generated results (never claim high confidence)
const MAX_AI_CONFIDENCE = 0.6;

interface GeneratedTCode {
  tcode: string;
  description: string;
  module: string;
  explanation: string;
  confidence: number;
}

interface ValidationResult {
  tcode: string;
  isValid: boolean;
  correctedDescription?: string;
  validationNote: string;
  adjustedConfidence: number;
}

/**
 * Create a timeout promise
 */
function timeout<T>(ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fallback), ms));
}

/**
 * First LLM call: Generate T-code suggestions based on SAP knowledge
 */
async function generateTCodeSuggestions(
  openai: OpenAI,
  query: string,
  limit: number
): Promise<GeneratedTCode[]> {
  const prompt = `You are an SAP T-code expert. The user is searching for a T-code but no results were found in the database.

Based on your knowledge of SAP transaction codes, suggest the most likely T-codes that match this search query.

IMPORTANT RULES:
1. Only suggest REAL SAP T-codes that actually exist
2. Be conservative - if you're not sure, don't suggest it
3. Include the SAP module (FI, MM, SD, PP, HR, etc.)
4. Provide a brief, accurate description
5. Explain WHY this T-code matches the user's query

User's search query: "${query}"

Respond with JSON: {"suggestions":[{"tcode":"XX01","description":"Description","module":"XX","explanation":"Why this matches","confidence":0.0-0.6}]}

Maximum ${limit} suggestions. Only include T-codes you are confident exist.`;

  try {
    const response = await openai.chat.completions.create({
      model: FALLBACK_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an SAP expert. Only suggest T-codes you are confident actually exist in SAP systems.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content) as { suggestions: GeneratedTCode[] };
    return parsed.suggestions || [];
  } catch (error) {
    console.error('AI fallback generation error:', error);
    return [];
  }
}

/**
 * Second LLM call: Validate the generated suggestions
 */
async function validateSuggestions(
  openai: OpenAI,
  suggestions: GeneratedTCode[]
): Promise<ValidationResult[]> {
  if (suggestions.length === 0) return [];

  const suggestionList = suggestions
    .map((s) => `${s.tcode}: ${s.description} (${s.module})`)
    .join('\n');

  const prompt = `You are an SAP T-code validator. Verify if these T-codes are REAL SAP transaction codes.

For each T-code, determine:
1. Does this T-code actually exist in SAP?
2. Is the description accurate?
3. Is the module assignment correct?

T-codes to validate:
${suggestionList}

Respond with JSON: {"validations":[{"tcode":"XX01","isValid":true/false,"correctedDescription":"If needed","validationNote":"Brief note","adjustedConfidence":0.0-0.6}]}

Be strict - if you're not certain the T-code exists, mark isValid as false.
Lower the confidence if the description seems inaccurate.`;

  try {
    const response = await openai.chat.completions.create({
      model: FALLBACK_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a strict SAP validator. Only confirm T-codes you are certain exist.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content) as { validations: ValidationResult[] };
    return parsed.validations || [];
  } catch (error) {
    console.error('AI fallback validation error:', error);
    return [];
  }
}

/**
 * Generate AI fallback suggestions when database returns no results
 * Uses dual LLM validation for accuracy
 */
export async function generateAIFallbackSuggestions(
  query: string,
  limit: number = 3
): Promise<AISearchResult[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.log('OpenAI API key not configured for AI fallback');
    return [];
  }

  // Check cache first
  const cacheKey = `${query.toLowerCase().trim()}:${limit}`;
  const cached = await getCached<AISearchResult[]>(CACHE_PREFIX, cacheKey);
  if (cached) {
    console.log('AI fallback cache hit:', query);
    return cached;
  }

  console.log('AI fallback cache miss, generating suggestions for:', query);

  const openai = new OpenAI();

  // Step 1: Generate suggestions with timeout
  const generationPromise = generateTCodeSuggestions(openai, query, limit);
  const suggestions = await Promise.race([
    generationPromise,
    timeout(GPT_TIMEOUT_MS, [] as GeneratedTCode[]),
  ]);

  if (suggestions.length === 0) {
    console.log('AI fallback: No suggestions generated');
    return [];
  }

  console.log(`AI fallback: Generated ${suggestions.length} suggestions, validating...`);

  // Step 2: Validate suggestions with timeout
  const validationPromise = validateSuggestions(openai, suggestions);
  const validations = await Promise.race([
    validationPromise,
    timeout(GPT_TIMEOUT_MS, [] as ValidationResult[]),
  ]);

  // Step 3: Merge and filter results
  const results: AISearchResult[] = [];

  for (const suggestion of suggestions) {
    const validation = validations.find(
      (v) => v.tcode.toUpperCase() === suggestion.tcode.toUpperCase()
    );

    // Skip if validation explicitly marked as invalid
    if (validation && !validation.isValid) {
      console.log(`AI fallback: Filtered out invalid T-code ${suggestion.tcode}`);
      continue;
    }

    // Calculate final confidence (cap at MAX_AI_CONFIDENCE)
    let finalConfidence = suggestion.confidence;
    if (validation) {
      finalConfidence = Math.min(validation.adjustedConfidence, MAX_AI_CONFIDENCE);
    } else {
      // No validation available - use lower confidence
      finalConfidence = Math.min(suggestion.confidence * 0.8, MAX_AI_CONFIDENCE - 0.1);
    }

    // Build explanation with validation note if available
    let explanation = suggestion.explanation;
    if (validation?.validationNote) {
      explanation = `${suggestion.explanation} (${validation.validationNote})`;
    }

    results.push({
      tcode: suggestion.tcode.toUpperCase(),
      description: validation?.correctedDescription || suggestion.description,
      module: suggestion.module?.toUpperCase() || null,
      explanation,
      confidence: finalConfidence,
      aiGenerated: true,
      source: 'ai-generated',
    });
  }

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);

  // Limit results
  const finalResults = results.slice(0, limit);

  // Cache the results
  if (finalResults.length > 0) {
    await setCached(CACHE_PREFIX, cacheKey, finalResults, CACHE_TTL);
  }

  console.log(`AI fallback: Returning ${finalResults.length} validated suggestions`);
  return finalResults;
}
