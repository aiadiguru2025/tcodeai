import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

// Module classification patterns
const MODULE_PATTERNS: Record<string, RegExp[]> = {
  MM: [/^ME/, /^MB/, /^MI/, /^MK/, /^MM/, /^MW/],
  SD: [/^VA/, /^VD/, /^VL/, /^VF/, /^VK/, /^VB/],
  FI: [/^FB/, /^F-/, /^FK/, /^FD/, /^FS/, /^FBL/, /^FAGL/],
  CO: [/^KS/, /^KP/, /^KE/, /^KB/, /^KA/, /^KK/],
  PP: [/^CO0/, /^CR/, /^CA/, /^CS/, /^MD/, /^MF/],
  HR: [/^PA/, /^PB/, /^PT/, /^PE/, /^PO/, /^PP0/],
  PM: [/^IW/, /^IK/, /^IP/, /^IA/, /^IE/, /^IL/],
  WM: [/^LT/, /^LI/, /^LS/, /^LM/, /^LB/, /^LX/],
  QM: [/^QA/, /^QM/, /^QC/, /^QS/, /^QE/],
  PS: [/^CJ/, /^CN/, /^OP/, /^CJR/],
  BASIS: [/^SM/, /^SE/, /^SU/, /^SP/, /^ST/, /^SA/, /^SCC/, /^DB/],
  ABAP: [/^SE[0-9]/, /^SE[A-Z]/, /^SA[P]?L/],
  LE: [/^VL/, /^HU/, /^LT/],
  TR: [/^TBB/, /^TB/, /^FTR/],
  IM: [/^IM/, /^IMA/],
  RE: [/^RE/, /^FOA/],
};

function classifyModule(tcode: string): string | null {
  for (const [module, patterns] of Object.entries(MODULE_PATTERNS)) {
    if (patterns.some((p) => p.test(tcode))) {
      return module;
    }
  }
  return null;
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

interface CSVRow {
  'Transaction Code': string;
  Program: string;
  'Transaction Text': string;
}

async function main() {
  console.log('Starting T-code import...');

  const csvPath = join(process.cwd(), 'TSTC.csv');
  const records: CSVRow[] = [];

  // Parse CSV
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

  // Create SAP modules reference data
  const modules = [
    { code: 'MM', name: 'Materials Management', description: 'Procurement and inventory management' },
    { code: 'SD', name: 'Sales and Distribution', description: 'Sales, shipping, and billing' },
    { code: 'FI', name: 'Financial Accounting', description: 'General ledger, A/R, A/P' },
    { code: 'CO', name: 'Controlling', description: 'Cost accounting and management' },
    { code: 'PP', name: 'Production Planning', description: 'Manufacturing and production' },
    { code: 'HR', name: 'Human Resources', description: 'Personnel management' },
    { code: 'PM', name: 'Plant Maintenance', description: 'Equipment maintenance' },
    { code: 'WM', name: 'Warehouse Management', description: 'Warehouse operations' },
    { code: 'QM', name: 'Quality Management', description: 'Quality control and assurance' },
    { code: 'PS', name: 'Project System', description: 'Project management' },
    { code: 'BASIS', name: 'Basis/Admin', description: 'System administration' },
    { code: 'ABAP', name: 'ABAP Development', description: 'Programming and development' },
    { code: 'LE', name: 'Logistics Execution', description: 'Logistics and shipping' },
    { code: 'TR', name: 'Treasury', description: 'Treasury management' },
    { code: 'IM', name: 'Investment Management', description: 'Capital investment' },
    { code: 'RE', name: 'Real Estate', description: 'Real estate management' },
  ];

  // Insert modules
  for (const mod of modules) {
    await prisma.sAPModule.upsert({
      where: { code: mod.code },
      update: mod,
      create: { ...mod, keywords: [] },
    });
  }
  console.log(`Inserted ${modules.length} SAP modules`);

  // Batch insert T-codes
  const BATCH_SIZE = 1000;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const tcodes = batch.map((row) => {
      const tcode = row['Transaction Code']?.trim();
      const program = row['Program']?.trim() || null;
      const description = row['Transaction Text']?.trim() || null;

      if (!tcode) {
        skipped++;
        return null;
      }

      return {
        tcode,
        program,
        description,
        module: classifyModule(tcode),
        usageCategory: determineUsageCategory(program, tcode),
        isDeprecated: false,
      };
    }).filter((t): t is NonNullable<typeof t> => t !== null);

    // Use createMany with skipDuplicates
    const result = await prisma.transactionCode.createMany({
      data: tcodes,
      skipDuplicates: true,
    });

    inserted += result.count;
    console.log(`Progress: ${Math.min(i + BATCH_SIZE, records.length)}/${records.length} (inserted: ${inserted})`);
  }

  console.log(`\nImport complete!`);
  console.log(`Total records: ${records.length}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (duplicates/empty): ${records.length - inserted}`);

  // Print module distribution
  const moduleCounts = await prisma.transactionCode.groupBy({
    by: ['module'],
    _count: { module: true },
    orderBy: { _count: { module: 'desc' } },
  });

  console.log('\nModule distribution:');
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
