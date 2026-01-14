import OpenAI from 'openai';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const openai = new OpenAI();

const BATCH_SIZE = 100;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const DELAY_MS = 500;

async function main(): Promise<void> {
  console.log(`\n🔄 Embedding Regeneration for Enriched T-codes\n`);

  // Get T-codes with enriched descriptions
  const tcodes = await prisma.transactionCode.findMany({
    where: { descriptionEnriched: { not: null } },
    select: { id: true, tcode: true, description: true, descriptionEnriched: true },
  });

  console.log(`Found ${tcodes.length} T-codes with enriched descriptions\n`);

  if (tcodes.length === 0) {
    console.log('No T-codes to process. Run enrich-descriptions.ts first.');
    await prisma.$disconnect();
    return;
  }

  let updatedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < tcodes.length; i += BATCH_SIZE) {
    const batch = tcodes.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(tcodes.length / BATCH_SIZE);

    process.stdout.write(`[${batchNum}/${totalBatches}] Generating embeddings for ${batch.length} T-codes... `);

    try {
      // Create combined text for embedding (tcode + enriched description)
      const texts = batch.map(t =>
        `${t.tcode}: ${t.descriptionEnriched || t.description}`
      );

      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
      });

      // Update embeddings in database using raw SQL
      for (let j = 0; j < batch.length; j++) {
        const embedding = response.data[j].embedding;
        const embeddingStr = `[${embedding.join(',')}]`;

        await prisma.$executeRaw`
          UPDATE transaction_codes
          SET embedding = ${embeddingStr}::vector
          WHERE id = ${batch[j].id}
        `;
        updatedCount++;
      }

      console.log(`✓`);
    } catch (error) {
      errorCount++;
      console.log(`✗ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Rate limiting
    if (i + BATCH_SIZE < tcodes.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Embedding Regeneration Complete`);
  console.log(`   Total processed: ${tcodes.length}`);
  console.log(`   Successfully updated: ${updatedCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`${'='.repeat(50)}\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
