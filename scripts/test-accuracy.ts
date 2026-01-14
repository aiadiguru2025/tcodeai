import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const API_URL = process.env.API_URL || 'https://tcodeai.vercel.app';
const DELAY_MS = 2000; // Delay between requests to avoid rate limiting

interface TestCase {
  tcode: string;
  description: string;
  module: string;
}

interface TestResult {
  query: string;
  expectedTcode: string;
  module: string;
  results: string[];
  inTop1: boolean;
  inTop3: boolean;
  inTop5: boolean;
  processingTimeMs: number;
  error?: string;
}

interface ModuleStats {
  total: number;
  top1: number;
  top3: number;
  top5: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchAI(query: string): Promise<{ tcodes: string[]; timeMs: number }> {
  const startTime = Date.now();

  const response = await fetch(`${API_URL}/api/v1/search/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit: 5 }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const tcodes = data.results?.map((r: { tcode: string }) => r.tcode.toUpperCase()) || [];

  return {
    tcodes,
    timeMs: Date.now() - startTime,
  };
}

function loadTestCases(filePath: string): TestCase[] {
  // Read and strip BOM if present
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record: Record<string, string>) => ({
    tcode: (record.tcode || record.TCODE || record.TCode || '').toUpperCase().trim(),
    description: record.description || record.DESCRIPTION || record.Description || record.desc || '',
    module: (record.module || record.MODULE || record.Module || 'UNKNOWN').toUpperCase().trim(),
  }));
}

async function runTests(testCases: TestCase[], limit?: number): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const casesToTest = limit ? testCases.slice(0, limit) : testCases;

  console.log(`\nRunning ${casesToTest.length} test cases...\n`);

  for (let i = 0; i < casesToTest.length; i++) {
    const testCase = casesToTest[i];
    const progress = `[${i + 1}/${casesToTest.length}]`;

    process.stdout.write(`${progress} Testing: "${testCase.description.substring(0, 40)}..." `);

    try {
      const { tcodes, timeMs } = await searchAI(testCase.description);

      const result: TestResult = {
        query: testCase.description,
        expectedTcode: testCase.tcode,
        module: testCase.module,
        results: tcodes,
        inTop1: tcodes[0]?.toUpperCase() === testCase.tcode,
        inTop3: tcodes.slice(0, 3).map(t => t.toUpperCase()).includes(testCase.tcode),
        inTop5: tcodes.map(t => t.toUpperCase()).includes(testCase.tcode),
        processingTimeMs: timeMs,
      };

      results.push(result);

      const status = result.inTop1 ? '✓ Top-1' : result.inTop3 ? '~ Top-3' : result.inTop5 ? '○ Top-5' : '✗ Miss';
      console.log(status);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        query: testCase.description,
        expectedTcode: testCase.tcode,
        module: testCase.module,
        results: [],
        inTop1: false,
        inTop3: false,
        inTop5: false,
        processingTimeMs: 0,
        error: errorMessage,
      });
      console.log(`✗ Error: ${errorMessage}`);
    }

    // Delay between requests
    if (i < casesToTest.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  return results;
}

function generateReport(results: TestResult[]): void {
  const total = results.length;
  const successful = results.filter(r => !r.error);
  const errors = results.filter(r => r.error);

  // Overall stats
  const top1Count = successful.filter(r => r.inTop1).length;
  const top3Count = successful.filter(r => r.inTop3).length;
  const top5Count = successful.filter(r => r.inTop5).length;

  // Per-module stats
  const moduleStats: Record<string, ModuleStats> = {};

  for (const result of successful) {
    if (!moduleStats[result.module]) {
      moduleStats[result.module] = { total: 0, top1: 0, top3: 0, top5: 0 };
    }
    moduleStats[result.module].total++;
    if (result.inTop1) moduleStats[result.module].top1++;
    if (result.inTop3) moduleStats[result.module].top3++;
    if (result.inTop5) moduleStats[result.module].top5++;
  }

  // Failed cases
  const failedCases = successful.filter(r => !r.inTop5).slice(0, 10);

  // Average processing time
  const avgTime = successful.length > 0
    ? Math.round(successful.reduce((sum, r) => sum + r.processingTimeMs, 0) / successful.length)
    : 0;

  // Print report
  console.log('\n' + '='.repeat(60));
  console.log('           TCodeAI Accuracy Test Report');
  console.log('='.repeat(60));
  console.log(`\nDate: ${new Date().toISOString()}`);
  console.log(`Total Test Cases: ${total}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Avg Response Time: ${avgTime}ms`);

  console.log('\n--- Overall Accuracy ---');
  console.log(`Top-1 Accuracy: ${((top1Count / successful.length) * 100).toFixed(1)}% (${top1Count}/${successful.length})`);
  console.log(`Top-3 Accuracy: ${((top3Count / successful.length) * 100).toFixed(1)}% (${top3Count}/${successful.length})`);
  console.log(`Top-5 Accuracy: ${((top5Count / successful.length) * 100).toFixed(1)}% (${top5Count}/${successful.length})`);

  console.log('\n--- Accuracy by Module ---');
  const sortedModules = Object.entries(moduleStats).sort((a, b) => b[1].total - a[1].total);
  for (const [module, stats] of sortedModules) {
    const accuracy = ((stats.top5 / stats.total) * 100).toFixed(1);
    console.log(`${module.padEnd(10)} ${accuracy}% (${stats.top5}/${stats.total}) | Top-1: ${stats.top1}, Top-3: ${stats.top3}`);
  }

  if (failedCases.length > 0) {
    console.log('\n--- Sample Failed Queries (not in Top-5) ---');
    failedCases.forEach((result, index) => {
      console.log(`\n${index + 1}. Query: "${result.query}"`);
      console.log(`   Expected: ${result.expectedTcode} (${result.module})`);
      console.log(`   Got: ${result.results.join(', ') || 'No results'}`);
    });
  }

  if (errors.length > 0) {
    console.log('\n--- Errors ---');
    errors.slice(0, 5).forEach((result, index) => {
      console.log(`${index + 1}. "${result.query}" - ${result.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/test-accuracy.ts <csv-file> [--limit N]');
    console.log('\nCSV format: tcode,description,module');
    console.log('\nExample:');
    console.log('  npx tsx scripts/test-accuracy.ts test-data/test.csv');
    console.log('  npx tsx scripts/test-accuracy.ts test-data/test.csv --limit 20');
    process.exit(1);
  }

  const csvPath = args[0];
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : undefined;

  if (!fs.existsSync(csvPath)) {
    console.error(`Error: File not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`\nTCodeAI Accuracy Test`);
  console.log(`API: ${API_URL}`);
  console.log(`File: ${csvPath}`);
  if (limit) console.log(`Limit: ${limit} test cases`);

  try {
    const testCases = loadTestCases(csvPath);
    console.log(`Loaded ${testCases.length} test cases`);

    const results = await runTests(testCases, limit);

    generateReport(results);

    // Save detailed results to JSON
    const outputPath = path.join(path.dirname(csvPath), 'test-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\nDetailed results saved to: ${outputPath}`);

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
