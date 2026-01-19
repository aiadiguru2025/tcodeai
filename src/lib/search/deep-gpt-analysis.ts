import OpenAI from 'openai';
import type { AISearchResult } from '@/types';

const DEEP_GPT_MODEL = 'gpt-4o-mini';
const DEEP_GPT_TIMEOUT_MS = 7000; // 7 seconds for deep analysis (reduced from 10s)

export interface DeepAnalysisResult {
  suggestedTCodes: Array<{
    tcode: string;
    description: string;
    module: string;
    explanation: string;
    confidence: number;
    source: 'gpt-knowledge' | 'web-validated';
  }>;
  queryInterpretation: string;
  ambiguityNotes: string | null;
}

/**
 * Create a timeout promise
 */
function timeout<T>(ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fallback), ms));
}

/**
 * Build the deep analysis prompt for uncertain queries
 */
function buildDeepAnalysisPrompt(
  query: string,
  existingCandidates: AISearchResult[],
  webContent: string,
  topConfidence: number
): string {
  const candidatesInfo = existingCandidates
    .slice(0, 5)
    .map((c) => `- ${c.tcode}: ${c.description || 'N/A'} (confidence: ${(c.confidence * 100).toFixed(0)}%)`)
    .join('\n');

  const webContext = webContent
    ? `\n\nWEB SEARCH FINDINGS:\n${webContent.slice(0, 1500)}...`
    : '';

  return `You are an SAP expert performing DEEP ANALYSIS on a search query where standard search returned low confidence results (best match: ${(topConfidence * 100).toFixed(0)}%).

USER QUERY: "${query}"

EXISTING CANDIDATES (from database):
${candidatesInfo || 'No candidates found'}
${webContext}

YOUR TASK:
1. INTERPRET the user's intent - what SAP functionality are they likely looking for?
2. CONSIDER common SAP terminology variations, abbreviations, and module-specific terms
3. IDENTIFY the most relevant T-codes based on:
   - Your comprehensive SAP knowledge
   - The web search findings (if available)
   - The existing database candidates
4. For EACH suggested T-code:
   - Provide a detailed explanation of why it matches
   - Consider country-specific variants (MOLGA codes like M10=USA, M01=Germany)
   - Note any prerequisites or related T-codes

OUTPUT FORMAT (JSON):
{
  "queryInterpretation": "What the user is likely trying to do in SAP...",
  "suggestedTCodes": [
    {
      "tcode": "XX01",
      "description": "Description of what this T-code does",
      "module": "FI/MM/SD/HR/etc",
      "explanation": "Detailed explanation of why this matches the query",
      "confidence": 0.0-1.0,
      "source": "gpt-knowledge"
    }
  ],
  "ambiguityNotes": "Any ambiguity in the query that affects results, or null if clear"
}

IMPORTANT:
- Only suggest T-codes you are confident exist in SAP
- Be conservative with confidence scores (0.5-0.85 range for GPT suggestions)
- If suggesting country-specific T-codes, explain the MOLGA pattern
- Maximum 5 suggestions`;
}

/**
 * Parse the deep analysis response from GPT
 */
function parseDeepAnalysisResponse(content: string): DeepAnalysisResult | null {
  try {
    const parsed = JSON.parse(content);

    if (!parsed.suggestedTCodes || !Array.isArray(parsed.suggestedTCodes)) {
      return null;
    }

    return {
      queryInterpretation: parsed.queryInterpretation || 'Unable to interpret query',
      suggestedTCodes: parsed.suggestedTCodes.map((s: {
        tcode?: string;
        description?: string;
        module?: string;
        explanation?: string;
        confidence?: number;
        source?: string;
      }) => ({
        tcode: (s.tcode || '').toUpperCase(),
        description: s.description || 'N/A',
        module: s.module || 'Unknown',
        explanation: s.explanation || 'Suggested based on SAP knowledge',
        confidence: Math.min(0.85, Math.max(0.3, s.confidence || 0.5)), // Cap at 0.85
        source: s.source === 'web-validated' ? 'web-validated' : 'gpt-knowledge',
      })),
      ambiguityNotes: parsed.ambiguityNotes || null,
    };
  } catch {
    console.error('Failed to parse deep analysis response');
    return null;
  }
}

/**
 * Perform deep GPT analysis for low-confidence queries
 * This uses a more sophisticated reasoning prompt to find relevant T-codes
 */
export async function performDeepGPTAnalysis(
  query: string,
  existingCandidates: AISearchResult[],
  webContent: string
): Promise<DeepAnalysisResult | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.log('OpenAI API key not configured for deep analysis');
    return null;
  }

  const topConfidence = existingCandidates[0]?.confidence ?? 0;
  const prompt = buildDeepAnalysisPrompt(query, existingCandidates, webContent, topConfidence);

  const openai = new OpenAI();

  const gptPromise = openai.chat.completions
    .create({
      model: DEEP_GPT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an SAP expert with comprehensive knowledge of SAP transaction codes across all modules (FI, CO, MM, SD, HR, PP, PM, QM, WM, etc.). Provide accurate, helpful suggestions based on your expertise.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Slightly higher for creative suggestions
      max_tokens: 800,
    })
    .then((response) => response.choices[0]?.message?.content)
    .catch((err) => {
      console.error('Deep GPT analysis error:', err);
      return null;
    });

  // Race between GPT call and timeout
  const content = await Promise.race([gptPromise, timeout(DEEP_GPT_TIMEOUT_MS, null)]);

  if (!content) {
    console.log('Deep GPT analysis timed out or failed');
    return null;
  }

  const result = parseDeepAnalysisResponse(content);

  if (result) {
    console.log(`Deep GPT analysis completed: ${result.suggestedTCodes.length} suggestions`);
    if (result.queryInterpretation) {
      console.log(`Query interpretation: ${result.queryInterpretation}`);
    }
    if (result.ambiguityNotes) {
      console.log(`Ambiguity notes: ${result.ambiguityNotes}`);
    }
  }

  return result;
}

/**
 * Convert deep analysis results to AISearchResult format
 */
export function deepAnalysisToAIResults(analysis: DeepAnalysisResult): AISearchResult[] {
  return analysis.suggestedTCodes.map((s) => ({
    tcode: s.tcode,
    description: s.description,
    module: s.module,
    explanation: s.explanation,
    confidence: s.confidence,
    aiGenerated: true,
    source: s.source === 'web-validated' ? 'web' : 'ai-generated',
  }));
}
