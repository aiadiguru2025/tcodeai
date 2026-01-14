import OpenAI from 'openai';
import { executeSemanticSearch } from './semantic-search';
import type { AISearchResult } from '@/types';

const EXPLANATION_MODEL = 'gpt-4o-mini';

export async function executeAISearch(
  query: string,
  limit: number = 5
): Promise<AISearchResult[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI();

  // Get semantic search results as candidates
  const candidates = await executeSemanticSearch(query, undefined, false, limit);

  if (candidates.length === 0) {
    return [];
  }

  // Format candidates for the prompt
  const candidateList = candidates
    .map(
      (c, i) =>
        `${i + 1}. ${c.tcode} - ${c.description || 'No description'} (Module: ${c.module || 'Unknown'})`
    )
    .join('\n');

  // Generate explanations using GPT
  const response = await openai.chat.completions.create({
    model: EXPLANATION_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are an SAP expert helping users find the right transaction code. Given a user's query and a list of candidate T-codes, explain why each T-code might match their needs. Be concise (1-2 sentences per explanation). Also rate your confidence (0.0-1.0) that each T-code matches the user's intent.

Respond in JSON format:
{
  "results": [
    {"tcode": "XX01", "explanation": "Brief explanation", "confidence": 0.95}
  ]
}`,
      },
      {
        role: 'user',
        content: `User query: "${query}"

Candidate T-codes:
${candidateList}

Provide explanations for each candidate.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    // Fallback: return candidates without explanations
    return candidates.map((c) => ({
      tcode: c.tcode,
      description: c.description,
      module: c.module,
      explanation: 'This T-code matches your search criteria.',
      confidence: c.relevanceScore,
    }));
  }

  try {
    const parsed = JSON.parse(content) as {
      results: Array<{ tcode: string; explanation: string; confidence: number }>;
    };

    // Merge explanations with candidate data
    return candidates.map((candidate) => {
      const explanation = parsed.results.find(
        (r) => r.tcode.toUpperCase() === candidate.tcode.toUpperCase()
      );

      return {
        tcode: candidate.tcode,
        description: candidate.description,
        module: candidate.module,
        explanation: explanation?.explanation || 'This T-code matches your search criteria.',
        confidence: explanation?.confidence ?? candidate.relevanceScore,
      };
    });
  } catch {
    // JSON parse failed, return candidates with default explanations
    return candidates.map((c) => ({
      tcode: c.tcode,
      description: c.description,
      module: c.module,
      explanation: 'This T-code matches your search criteria.',
      confidence: c.relevanceScore,
    }));
  }
}
