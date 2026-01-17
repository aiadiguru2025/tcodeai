import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface FioriCSVRow {
  'UI Technology': string;
  'App ID': string;
  'App Name': string;
  'App Launcher Title - Subtitle (Information)': string;
  'Transaction Codes': string;
  'Application Component Description': string;
  'Line Of Business': string;
  'Semantic Object - Action': string;
  'Business Catalog Title': string;
  'Product version (Frontend) - Official Name'?: string;
}

/**
 * Parse multi-value fields (pipe-separated)
 */
function parseMultiValue(value: string): string[] {
  if (!value || value.trim() === '') return [];
  return value
    .split('|')
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Parse T-codes from various formats:
 * - "VA01"
 * - "VA01, VA02"
 * - "VA01 | VA02"
 * - "SWF_FLEX_WD_BRF_DECISION_APP (SWF_FLEX_ECR_BRF_DECISION)"
 */
function parseTCodes(value: string): string[] {
  if (!value || value.trim() === '') return [];

  const tcodes: Set<string> = new Set();

  // First, extract any T-codes from parentheses
  const parenMatches = value.match(/\(([^)]+)\)/g);
  if (parenMatches) {
    for (const match of parenMatches) {
      const inner = match.slice(1, -1).trim();
      if (inner && /^[A-Z0-9_/]+$/i.test(inner)) {
        tcodes.add(inner.toUpperCase());
      }
    }
  }

  // Remove parenthetical content for main parsing
  const cleanValue = value.replace(/\([^)]*\)/g, '');

  // Split by comma, pipe, or whitespace (for multiple T-codes)
  const parts = cleanValue.split(/[,|]+/);

  for (const part of parts) {
    const trimmed = part.trim();
    // Only accept valid T-code patterns (alphanumeric with underscores or slashes)
    if (trimmed && /^[A-Z0-9_/]+$/i.test(trimmed) && trimmed.length <= 50) {
      tcodes.add(trimmed.toUpperCase());
    }
  }

  return Array.from(tcodes);
}

async function main() {
  console.log('Starting Fiori apps import...');
  console.log('');

  // Build T-code lookup map for efficient matching
  console.log('Building T-code lookup map...');
  const existingTCodes = await prisma.transactionCode.findMany({
    select: { id: true, tcode: true },
  });
  const tcodeLookup = new Map<string, number>(
    existingTCodes.map((t) => [t.tcode.toUpperCase(), t.id])
  );
  console.log(`Loaded ${tcodeLookup.size} existing T-codes for matching`);
  console.log('');

  // Parse CSV
  const csvPath = join(process.cwd(), 'fiori_details.csv');
  const records: FioriCSVRow[] = [];

  const parser = createReadStream(csvPath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    })
  );

  for await (const record of parser) {
    records.push(record);
  }

  console.log(`Parsed ${records.length} records from CSV`);
  console.log('');

  // Track statistics
  let appsInserted = 0;
  let mappingsCreated = 0;
  let mappingsWithMatch = 0;
  let skippedDuplicates = 0;

  // Process in batches
  const BATCH_SIZE = 500;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      const appId = row['App ID']?.trim();
      const appName = row['App Name']?.trim();
      const uiTechnology = row['UI Technology']?.trim();

      // Skip rows without essential data
      if (!appId || !appName || !uiTechnology) {
        continue;
      }

      try {
        // Create or update the Fiori app
        const productVersion = row['Product version (Frontend) - Official Name']?.trim() || null;
        const fioriApp = await prisma.fioriApp.upsert({
          where: { appId },
          update: {
            appName,
            appLauncherTitle: row['App Launcher Title - Subtitle (Information)']?.trim() || null,
            uiTechnology,
            appComponentDesc: row['Application Component Description']?.trim() || null,
            lineOfBusiness: parseMultiValue(row['Line Of Business']),
            semanticObjectAction: parseMultiValue(row['Semantic Object - Action']),
            businessCatalogTitle: row['Business Catalog Title']?.trim() || null,
            productVersion,
          },
          create: {
            appId,
            appName,
            appLauncherTitle: row['App Launcher Title - Subtitle (Information)']?.trim() || null,
            uiTechnology,
            appComponentDesc: row['Application Component Description']?.trim() || null,
            lineOfBusiness: parseMultiValue(row['Line Of Business']),
            semanticObjectAction: parseMultiValue(row['Semantic Object - Action']),
            businessCatalogTitle: row['Business Catalog Title']?.trim() || null,
            productVersion,
          },
        });

        appsInserted++;

        // Parse and create T-code mappings
        const tcodes = parseTCodes(row['Transaction Codes']);

        for (const tcodeRaw of tcodes) {
          const tcodeId = tcodeLookup.get(tcodeRaw) || null;

          try {
            await prisma.fioriTCodeMapping.upsert({
              where: {
                fioriAppId_tcodeRaw: {
                  fioriAppId: fioriApp.id,
                  tcodeRaw,
                },
              },
              update: { tcodeId },
              create: {
                fioriAppId: fioriApp.id,
                tcodeId,
                tcodeRaw,
              },
            });

            mappingsCreated++;
            if (tcodeId) mappingsWithMatch++;
          } catch {
            skippedDuplicates++;
          }
        }
      } catch (error) {
        console.error(`Error processing app ${appId}:`, error);
      }
    }

    // Progress update
    const progress = Math.min(i + BATCH_SIZE, records.length);
    console.log(
      `Progress: ${progress}/${records.length} (${Math.round((progress / records.length) * 100)}%) - Apps: ${appsInserted}, Mappings: ${mappingsCreated}`
    );
  }

  console.log('');
  console.log('=== Import Complete ===');
  console.log(`Total CSV records: ${records.length}`);
  console.log(`Fiori apps inserted/updated: ${appsInserted}`);
  console.log(`T-code mappings created: ${mappingsCreated}`);
  console.log(`Mappings with T-code match: ${mappingsWithMatch}`);
  console.log(`Mappings without match: ${mappingsCreated - mappingsWithMatch}`);
  console.log(`Skipped duplicates: ${skippedDuplicates}`);

  // Print UI technology distribution
  const techCounts = await prisma.fioriApp.groupBy({
    by: ['uiTechnology'],
    _count: { uiTechnology: true },
    orderBy: { _count: { uiTechnology: 'desc' } },
  });

  console.log('');
  console.log('UI Technology distribution:');
  for (const { uiTechnology, _count } of techCounts.slice(0, 10)) {
    console.log(`  ${uiTechnology}: ${_count.uiTechnology}`);
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
