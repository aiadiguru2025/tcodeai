import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const openai = new OpenAI();

const BATCH_SIZE = 50;
const DELAY_MS = 1000;

// Priority modules (most commonly used)
const PRIORITY_MODULES = ['FI', 'CO', 'MM', 'SD', 'PP', 'HR', 'BASIS', 'BC', 'CA'];

// Top BASIS T-codes that are commonly searched
const TOP_BASIS_TCODES = [
  'SE11', 'SE12', 'SE16', 'SE16N', 'SE16H', 'SE37', 'SE38', 'SE80', 'SE93',
  'SM12', 'SM21', 'SM30', 'SM31', 'SM35', 'SM36', 'SM37', 'SM50', 'SM51', 'SM59', 'SM66',
  'SU01', 'SU02', 'SU10', 'SU53', 'PFCG',
  'ST01', 'ST02', 'ST03', 'ST04', 'ST05', 'ST06', 'ST12', 'ST22',
  'RZ10', 'RZ11', 'RZ12', 'RZ20',
  'SCC4', 'SCCL', 'SCC1', 'SCC3', 'SCC5', 'SCC7', 'SCC8', 'SCC9',
  'SPAM', 'SNOTE', 'STMS', 'SE01', 'SE03', 'SE09', 'SE10',
  'FB50', 'FB01', 'FB60', 'FB70', 'FB03', 'F-02', 'F-28', 'F-32', 'F110',
  'ME21N', 'ME22N', 'ME23N', 'ME51N', 'ME52N', 'ME53N', 'MIGO', 'MIRO',
  'VA01', 'VA02', 'VA03', 'VL01N', 'VL02N', 'VF01', 'VF02', 'VF03',
  'CO01', 'CO02', 'CO03', 'COR1', 'COR2', 'MD04', 'MD01', 'MD02',
  'XK01', 'XK02', 'XK03', 'XD01', 'XD02', 'XD03', 'BP',
  'MM01', 'MM02', 'MM03', 'MB51', 'MB52', 'MMBE',
  'PA20', 'PA30', 'PA40', 'PT60', 'PT61',
  'SPRO', 'IMG', 'SALE', 'WE20', 'WE21', 'BD54'
];

interface TCodeRecord {
  id: number;
  tcode: string;
  description: string | null;
  module: string | null;
}

async function enrichBatch(tcodes: TCodeRecord[]): Promise<Map<string, string>> {
  const prompt = `You are an SAP expert. Expand these T-code descriptions.

Rules:
1. Expand ALL SAP abbreviations (Pstg=Posting, Acct=Account, Maint=Maintenance, Disp=Display, etc.)
2. Add 2-3 common use cases or scenarios where this T-code is used
3. Include alternative search terms users might type
4. Keep each description under 200 characters
5. Return valid JSON only

T-codes to enrich:
${tcodes.map(t => `${t.tcode}: ${t.description || 'No description'}`).join('\n')}

Return JSON format:
{"tcodes": [{"tcode": "XX01", "enriched": "expanded description with use cases..."}]}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return new Map();

    const parsed = JSON.parse(content) as { tcodes: Array<{ tcode: string; enriched: string }> };
    const result = new Map<string, string>();

    for (const item of parsed.tcodes) {
      result.set(item.tcode.toUpperCase(), item.enriched);
    }

    return result;
  } catch (error) {
    console.error('GPT enrichment error:', error);
    return new Map();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const limit = args.includes('--limit')
    ? parseInt(args[args.indexOf('--limit') + 1], 10)
    : 500;

  console.log(`\n🚀 TCode Description Enrichment`);
  console.log(`Target: ${limit} T-codes\n`);

  // First, enrich the top priority T-codes
  console.log('📋 Fetching priority T-codes...');

  const priorityTcodes = await prisma.transactionCode.findMany({
    where: {
      tcode: { in: TOP_BASIS_TCODES },
      descriptionEnriched: null,
    },
    select: { id: true, tcode: true, description: true, module: true },
  });

  console.log(`Found ${priorityTcodes.length} priority T-codes without enrichment`);

  // Then get T-codes from priority modules
  const moduleTcodes = await prisma.transactionCode.findMany({
    where: {
      descriptionEnriched: null,
      description: { not: null },
      module: { in: PRIORITY_MODULES },
      tcode: { notIn: TOP_BASIS_TCODES },
    },
    select: { id: true, tcode: true, description: true, module: true },
    orderBy: { tcode: 'asc' },
    take: limit - priorityTcodes.length,
  });

  const allTcodes = [...priorityTcodes, ...moduleTcodes].slice(0, limit);

  console.log(`\n📊 Processing ${allTcodes.length} T-codes in batches of ${BATCH_SIZE}...\n`);

  let enrichedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < allTcodes.length; i += BATCH_SIZE) {
    const batch = allTcodes.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allTcodes.length / BATCH_SIZE);

    process.stdout.write(`[${batchNum}/${totalBatches}] Enriching ${batch.length} T-codes... `);

    try {
      const enrichments = await enrichBatch(batch);

      // Update database
      for (const tcode of batch) {
        const enriched = enrichments.get(tcode.tcode.toUpperCase());
        if (enriched) {
          await prisma.transactionCode.update({
            where: { id: tcode.id },
            data: { descriptionEnriched: enriched },
          });
          enrichedCount++;
        }
      }

      console.log(`✓ ${enrichments.size} enriched`);
    } catch (error) {
      errorCount++;
      console.log(`✗ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Rate limiting
    if (i + BATCH_SIZE < allTcodes.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Enrichment Complete`);
  console.log(`   Total processed: ${allTcodes.length}`);
  console.log(`   Successfully enriched: ${enrichedCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`${'='.repeat(50)}\n`);

  // Show sample enrichments
  const samples = await prisma.transactionCode.findMany({
    where: {
      descriptionEnriched: { not: null },
      tcode: { in: ['SE16N', 'FB50', 'SM50', 'ME21N', 'VA01'].slice(0, 3) }
    },
    select: { tcode: true, description: true, descriptionEnriched: true },
    take: 3,
  });

  if (samples.length > 0) {
    console.log('📝 Sample Enrichments:\n');
    for (const s of samples) {
      console.log(`${s.tcode}:`);
      console.log(`  Before: ${s.description}`);
      console.log(`  After:  ${s.descriptionEnriched?.substring(0, 100)}...`);
      console.log();
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
