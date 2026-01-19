import prisma from '@/lib/db';
import { getCached, setCached } from '@/lib/cache';

const MOLGA_CACHE_PREFIX = 'molga-map';
const MOLGA_CACHE_TTL = 60 * 60 * 24; // 24 hours - MOLGA data rarely changes

interface MolgaEntry {
  molga: number;
  isoCode: string;
  country: string;
  aliases: string[];
}

interface MolgaMatch {
  molga: number;
  country: string;
  pattern: string; // e.g., "M10" for USA
  matchedTerm: string; // The term that matched in the query
}

// In-memory cache for MOLGA data (loaded once per instance)
let molgaDataCache: MolgaEntry[] | null = null;

/**
 * Load all MOLGA data from database (with caching)
 */
async function loadMolgaData(): Promise<MolgaEntry[]> {
  // Check in-memory cache first
  if (molgaDataCache) {
    return molgaDataCache;
  }

  // Check Redis/persistent cache
  const cached = await getCached<MolgaEntry[]>(MOLGA_CACHE_PREFIX, 'all');
  if (cached) {
    molgaDataCache = cached;
    return cached;
  }

  // Load from database
  const data = await prisma.molga.findMany({
    select: {
      molga: true,
      isoCode: true,
      country: true,
      aliases: true,
    },
  });

  // Cache the data
  await setCached(MOLGA_CACHE_PREFIX, 'all', data, MOLGA_CACHE_TTL);
  molgaDataCache = data;

  return data;
}

/**
 * Detect country references in a query and return matching MOLGA info
 * Returns all matching countries found in the query
 */
export async function detectCountryInQuery(query: string): Promise<MolgaMatch[]> {
  const molgaData = await loadMolgaData();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  const matches: MolgaMatch[] = [];

  for (const entry of molgaData) {
    // Check ISO code (exact word match, case-insensitive)
    if (queryWords.includes(entry.isoCode.toLowerCase())) {
      matches.push({
        molga: entry.molga,
        country: entry.country,
        pattern: `M${entry.molga.toString().padStart(2, '0')}`,
        matchedTerm: entry.isoCode,
      });
      continue;
    }

    // Check country name (partial match for multi-word countries)
    if (queryLower.includes(entry.country.toLowerCase())) {
      matches.push({
        molga: entry.molga,
        country: entry.country,
        pattern: `M${entry.molga.toString().padStart(2, '0')}`,
        matchedTerm: entry.country,
      });
      continue;
    }

    // Check aliases
    for (const alias of entry.aliases) {
      if (queryLower.includes(alias.toLowerCase())) {
        matches.push({
          molga: entry.molga,
          country: entry.country,
          pattern: `M${entry.molga.toString().padStart(2, '0')}`,
          matchedTerm: alias,
        });
        break; // Found a match for this entry, move to next
      }
    }
  }

  return matches;
}

/**
 * Get MOLGA pattern for a specific country/ISO code
 */
export async function getMolgaPattern(countryOrIso: string): Promise<string | null> {
  const molgaData = await loadMolgaData();
  const searchTerm = countryOrIso.toLowerCase();

  for (const entry of molgaData) {
    if (
      entry.isoCode.toLowerCase() === searchTerm ||
      entry.country.toLowerCase() === searchTerm ||
      entry.aliases.some((a) => a.toLowerCase() === searchTerm)
    ) {
      return `M${entry.molga.toString().padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Check if a T-code contains a MOLGA pattern
 * Returns the MOLGA number if found, null otherwise
 */
export function extractMolgaFromTcode(tcode: string): number | null {
  // Common patterns: PC00_M10_*, RPCEDTM10, *_M10_*, etc.
  const patterns = [
    /_M(\d{1,2})_/i,      // _M10_ pattern
    /_M(\d{1,2})$/i,      // _M10 at end
    /^M(\d{1,2})_/i,      // M10_ at start
    /M(\d{1,2})(?=[A-Z_]|$)/i, // M10 followed by letter, underscore, or end
  ];

  for (const pattern of patterns) {
    const match = tcode.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

/**
 * Apply MOLGA-based boost to search results
 * T-codes containing the correct MOLGA pattern get significantly boosted
 */
export async function applyMolgaBoost<
  T extends { tcode: string; confidence?: number; relevanceScore?: number }
>(results: T[], query: string): Promise<{ results: T[]; molgaDetected: MolgaMatch | null }> {
  if (results.length === 0) {
    return { results, molgaDetected: null };
  }

  // Detect country in query
  const countryMatches = await detectCountryInQuery(query);

  if (countryMatches.length === 0) {
    return { results, molgaDetected: null };
  }

  // Use the first match (most relevant)
  const molgaMatch = countryMatches[0];
  console.log(`MOLGA detected: ${molgaMatch.country} (${molgaMatch.pattern}) from "${molgaMatch.matchedTerm}"`);

  // Apply boost to T-codes containing the matching MOLGA pattern
  for (const result of results) {
    const tcodeMolga = extractMolgaFromTcode(result.tcode);

    if (tcodeMolga === molgaMatch.molga) {
      // Exact MOLGA match - significant boost
      if (result.confidence !== undefined) {
        result.confidence = Math.min(0.99, result.confidence * 1.5);
      }
      if (result.relevanceScore !== undefined) {
        result.relevanceScore = Math.min(1.0, result.relevanceScore * 1.5);
      }
      console.log(`  ✓ Boosted ${result.tcode} (MOLGA ${tcodeMolga} matches)`);
    } else if (tcodeMolga !== null && tcodeMolga !== molgaMatch.molga) {
      // Different MOLGA - penalize (wrong country)
      if (result.confidence !== undefined) {
        result.confidence *= 0.5;
      }
      if (result.relevanceScore !== undefined) {
        result.relevanceScore *= 0.5;
      }
      console.log(`  ✗ Penalized ${result.tcode} (MOLGA ${tcodeMolga} doesn't match ${molgaMatch.molga})`);
    }
    // T-codes without MOLGA pattern are not modified
  }

  return { results, molgaDetected: molgaMatch };
}

/**
 * Get all MOLGA entries (for reference/display)
 */
export async function getAllMolga(): Promise<MolgaEntry[]> {
  return loadMolgaData();
}
