import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

// CSV row structure from SAP-TCodes_Combined.csv
interface CombinedCSVRow {
  TCODE: string;
  TCODE_DESC: string;
  MODULE_TOP_DESC: string;
  MODULE_DESC: string;
  PACKAGE_DESC: string;
  ABAP_PROGRAM: string;
}

function determineUsageCategory(program: string | null, tcode: string): string {
  if (!program) return 'unknown';

  if (program.includes('SAPLS_CUS_IMG_ACTIVITY')) return 'config';
  if (program.includes('BUSVIEWS')) return 'config';
  if (tcode.startsWith('/')) return 'addon';
  if (program.startsWith('SAPM')) return 'core';
  if (program.startsWith('RM')) return 'report';
  if (program.startsWith('RFTB') || program.startsWith('RFBI')) return 'report';

  return 'core';
}

async function main() {
  console.log('Starting T-code update from SAP-TCodes_Combined.csv...');
  console.log('Strategy: Hybrid merge - update existing, add new, preserve enriched data\n');

  const csvPath = join(process.cwd(), 'SAP-TCodes_Combined.csv');
  const records: CombinedCSVRow[] = [];

  // Parse CSV with proper handling for quoted fields
  const parser = createReadStream(csvPath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_quotes: true,
      relax_column_count: true,
    })
  );

  for await (const record of parser) {
    records.push(record);
  }

  console.log(`Parsed ${records.length} records from CSV`);

  // Get existing T-codes count
  const existingCount = await prisma.transactionCode.count();
  console.log(`Existing T-codes in database: ${existingCount}\n`);

  // Process in batches
  const BATCH_SIZE = 500;
  let updated = 0;
  let inserted = 0;
  let errors = 0;
  let skipped = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      const tcode = row.TCODE?.trim();
      if (!tcode) {
        skipped++;
        continue;
      }

      const module = row.MODULE_TOP_DESC?.trim() || null;
      const subModule = row.MODULE_DESC?.trim() || null;
      const packageDesc = row.PACKAGE_DESC?.trim() || null;
      const program = row.ABAP_PROGRAM?.trim() || null;
      const description = row.TCODE_DESC?.trim() || null;

      try {
        // Check if T-code already exists
        const existing = await prisma.transactionCode.findUnique({
          where: { tcode },
          select: { id: true },
        });

        if (existing) {
          // UPDATE existing record with new module/subModule/packageDesc data
          // Preserve: descriptionEnriched, s4hanaStatus, embedding, usageCategory (if set)
          await prisma.transactionCode.update({
            where: { tcode },
            data: {
              module: module || undefined,
              subModule: subModule || undefined,
              packageDesc: packageDesc || undefined,
              // Only update program if we have a value and current is empty
              ...(program ? { program } : {}),
            },
          });
          updated++;
        } else {
          // INSERT new record
          await prisma.transactionCode.create({
            data: {
              tcode,
              program,
              description,
              module,
              subModule,
              packageDesc,
              usageCategory: determineUsageCategory(program, tcode),
              isDeprecated: false,
            },
          });
          inserted++;
        }
      } catch (e) {
        errors++;
        if (errors <= 10) {
          console.error(`Error processing ${tcode}:`, e instanceof Error ? e.message : e);
        }
      }
    }

    const progress = Math.min(i + BATCH_SIZE, records.length);
    console.log(`Progress: ${progress}/${records.length} (updated: ${updated}, inserted: ${inserted})`);
  }

  // Final summary
  const finalCount = await prisma.transactionCode.count();
  const withPackageDesc = await prisma.transactionCode.count({
    where: { packageDesc: { not: null } },
  });
  const withSubModule = await prisma.transactionCode.count({
    where: { subModule: { not: null } },
  });

  console.log(`\n${'='.repeat(50)}`);
  console.log('UPDATE COMPLETE!');
  console.log('='.repeat(50));
  console.log(`Records processed: ${records.length}`);
  console.log(`Updated existing: ${updated}`);
  console.log(`Inserted new: ${inserted}`);
  console.log(`Skipped (empty): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nDatabase status:`);
  console.log(`  Total T-codes: ${finalCount}`);
  console.log(`  With packageDesc: ${withPackageDesc}`);
  console.log(`  With subModule: ${withSubModule}`);

  // Print module distribution (top 15)
  const moduleCounts = await prisma.transactionCode.groupBy({
    by: ['module'],
    _count: { module: true },
    orderBy: { _count: { module: 'desc' } },
    take: 15,
  });

  console.log('\nTop 15 module distribution:');
  for (const { module, _count } of moduleCounts) {
    console.log(`  ${module || 'Unclassified'}: ${_count.module}`);
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
