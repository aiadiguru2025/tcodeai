import OpenAI from 'openai';
import type { AISearchResult } from '@/types';

// Constants
const JUDGE_MODEL = 'gpt-4o-mini';
const JUDGE_TIMEOUT_MS = 5000; // 5 seconds max
const JUDGE_TEMPERATURE = 0.1; // Low temperature for consistency

/**
 * Configuration for the LLM Judge
 */
export interface JudgeConfig {
  model: string;
  timeoutMs: number;
  temperature: number;
  enabled: boolean;
}

/**
 * Judgment verdict for a single result
 */
export interface JudgeVerdict {
  tcode: string;
  isExplanationAccurate: boolean;
  isConfidenceReasonable: boolean;
  correctedExplanation: string | null;
  correctedConfidence: number | null;
  reasoning: string;
}

/**
 * Batch judgment metrics
 */
export interface JudgeMetrics {
  verdicts: JudgeVerdict[];
  judgeModel: string;
  processingTimeMs: number;
  corrections: {
    explanationsFixed: number;
    confidencesAdjusted: number;
  };
}

/**
 * Structured response from the judge LLM
 */
interface JudgeStructuredResponse {
  judgments: Array<{
    tcode: string;
    explanation_accurate: boolean;
    confidence_reasonable: boolean;
    corrected_explanation: string | null;
    corrected_confidence: number | null;
    reasoning: string;
  }>;
}

// Configuration (can be overridden via environment)
export const judgeConfig: JudgeConfig = {
  model: process.env.JUDGE_MODEL || JUDGE_MODEL,
  timeoutMs: parseInt(process.env.JUDGE_TIMEOUT_MS || String(JUDGE_TIMEOUT_MS)),
  temperature: parseFloat(process.env.JUDGE_TEMPERATURE || String(JUDGE_TEMPERATURE)),
  enabled: process.env.DISABLE_LLM_JUDGE !== 'true',
};

/**
 * Create a timeout promise
 */
function timeout<T>(ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fallback), ms));
}

/**
 * Build the system prompt for the judge
 */
function buildSystemPrompt(): string {
  return `You are an SAP expert validator. Your task is to verify the accuracy of AI-generated explanations and confidence scores for SAP T-code search results.

For each result, you receive:
- The user's search query
- The T-code identifier
- Ground truth description (what the T-code ACTUALLY does)
- AI-generated explanation
- AI-generated confidence score (0.0-1.0)

VALIDATION RULES:

1. EXPLANATION ACCURACY:
   - ACCURATE: Explanation correctly describes what the T-code does based on ground truth description
   - INACCURATE: Explanation contains factual errors, describes wrong functionality, or makes unfounded claims
   - Minor phrasing differences are OK - focus on factual correctness

2. CONFIDENCE REASONABLENESS:
   - Check if the T-code is genuinely relevant to the user's query
   - High confidence (>0.8) is reasonable ONLY if the T-code directly addresses the query
   - Medium confidence (0.5-0.8) is reasonable for related but not exact matches
   - Low confidence (<0.5) is reasonable for tangentially related results

3. CORRECTIONS:
   - If explanation is inaccurate, provide a corrected explanation based on the ground truth description
   - If confidence is unreasonable, provide an adjusted value with justification
   - Keep corrections concise (under 100 characters for explanations)

Output a JSON object with judgments for ALL provided T-codes.`;
}

/**
 * Build the user prompt with results to validate
 */
function buildUserPrompt(query: string, results: AISearchResult[]): string {
  const resultsText = results
    .map(
      (r) => `---
T-code: ${r.tcode}
Ground Truth Description: ${r.description || 'N/A'}
Module: ${r.module || 'N/A'}
Generated Explanation: ${r.explanation}
Generated Confidence: ${r.confidence.toFixed(2)}
---`
    )
    .join('\n');

  return `Query: "${query}"

Results to validate:
${resultsText}

Validate each result and output JSON with this exact structure:
{
  "judgments": [
    {
      "tcode": "XX01",
      "explanation_accurate": true,
      "confidence_reasonable": true,
      "corrected_explanation": null,
      "corrected_confidence": null,
      "reasoning": "brief reason"
    }
  ]
}`;
}

/**
 * Parse and validate judgment response
 */
function parseJudgments(content: string): JudgeVerdict[] {
  const parsed = JSON.parse(content) as JudgeStructuredResponse;

  if (!parsed.judgments || !Array.isArray(parsed.judgments)) {
    throw new Error('Invalid judge response structure');
  }

  return parsed.judgments.map((j) => ({
    tcode: j.tcode,
    isExplanationAccurate: j.explanation_accurate,
    isConfidenceReasonable: j.confidence_reasonable,
    correctedExplanation: j.corrected_explanation,
    correctedConfidence: j.corrected_confidence,
    reasoning: j.reasoning,
  }));
}

/**
 * Apply judgments to results, correcting where needed
 */
function applyJudgments(
  results: AISearchResult[],
  judgments: JudgeVerdict[]
): AISearchResult[] {
  const judgmentMap = new Map(
    judgments.map((j) => [j.tcode.toUpperCase(), j])
  );

  return results.map((result) => {
    const judgment = judgmentMap.get(result.tcode.toUpperCase());

    if (!judgment) {
      return result; // No judgment for this result, keep original
    }

    return {
      ...result,
      explanation: judgment.correctedExplanation ?? result.explanation,
      confidence: judgment.correctedConfidence ?? result.confidence,
    };
  });
}

/**
 * Log judge results for monitoring
 */
function logJudgeResults(query: string, metrics: JudgeMetrics): void {
  const { corrections, processingTimeMs } = metrics;

  if (corrections.explanationsFixed > 0 || corrections.confidencesAdjusted > 0) {
    console.log(
      `[LLM Judge] Query: "${query.substring(0, 30)}..." | ` +
        `Corrections: ${corrections.explanationsFixed} explanations, ` +
        `${corrections.confidencesAdjusted} confidences | ` +
        `Time: ${processingTimeMs}ms`
    );

    // Log individual corrections for debugging
    metrics.verdicts
      .filter((v) => v.correctedExplanation || v.correctedConfidence !== null)
      .forEach((v) => {
        console.log(`  - ${v.tcode}: ${v.reasoning}`);
      });
  } else {
    console.log(
      `[LLM Judge] Query: "${query.substring(0, 30)}..." | ` +
        `No corrections needed | Time: ${processingTimeMs}ms`
    );
  }
}

/**
 * Execute the LLM judgment
 */
async function executeJudgment(
  query: string,
  results: AISearchResult[]
): Promise<JudgeVerdict[]> {
  const openai = new OpenAI();

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(query, results);

  const judgePromise = openai.chat.completions
    .create({
      model: judgeConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: judgeConfig.temperature,
      max_tokens: 800, // Enough for ~10 judgments
    })
    .then((response) => response.choices[0]?.message?.content);

  // Race against timeout
  const content = await Promise.race([
    judgePromise,
    timeout(judgeConfig.timeoutMs, null),
  ]);

  if (!content) {
    throw new Error('Judge timed out');
  }

  return parseJudgments(content);
}

/**
 * Validate and correct AI search results using LLM as judge
 */
export async function validateSearchResults(
  query: string,
  results: AISearchResult[]
): Promise<{ results: AISearchResult[]; judgeMetrics: JudgeMetrics | null }> {
  // Early return if judge is disabled
  if (!judgeConfig.enabled) {
    console.log('[LLM Judge] Disabled, skipping validation');
    return { results, judgeMetrics: null };
  }

  // Early return if no results to validate
  if (results.length === 0) {
    return { results, judgeMetrics: null };
  }

  const startTime = Date.now();

  try {
    const judgments = await executeJudgment(query, results);

    // Apply corrections to results
    const correctedResults = applyJudgments(results, judgments);

    const metrics: JudgeMetrics = {
      verdicts: judgments,
      judgeModel: judgeConfig.model,
      processingTimeMs: Date.now() - startTime,
      corrections: {
        explanationsFixed: judgments.filter(
          (j) => j.correctedExplanation !== null
        ).length,
        confidencesAdjusted: judgments.filter(
          (j) => j.correctedConfidence !== null
        ).length,
      },
    };

    // Log corrections for monitoring
    logJudgeResults(query, metrics);

    return { results: correctedResults, judgeMetrics: metrics };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.warn(
      `[LLM Judge] Error (${errorMessage}), returning uncorrected results`
    );
    return { results, judgeMetrics: null };
  }
}
