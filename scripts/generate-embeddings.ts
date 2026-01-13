import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI();

const BATCH_SIZE = 100; // OpenAI allows up to 2048 inputs per request
const EMBEDDING_MODEL = 'text-embedding-3-small';

interface TCodeForEmbedding {
  id: number;
  tcode: string;
  description: string | null;
  module: string | null;
}

function createEmbeddingText(tcode: TCodeForEmbedding): string {
  const parts = [tcode.tcode];

  if (tcode.description) {
    parts.push(tcode.description);
  }

  if (tcode.module) {
    parts.push(`Module: ${tcode.module}`);
  }

  return parts.join(' - ');
}

async function generateEmbeddings() {
  console.log('Starting embedding generation...');
  console.log(`Model: ${EMBEDDING_MODEL}`);
  console.log(`Batch size: ${BATCH_SIZE}`);

  // Get T-codes that need embeddings (those with descriptions, excluding IMG activities)
  const tcodes = await prisma.transactionCode.findMany({
    where: {
      description: { not: null },
      NOT: { program: 'SAPLS_CUS_IMG_ACTIVITY' },
    },
    select: {
      id: true,
      tcode: true,
      description: true,
      module: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`Found ${tcodes.length} T-codes to process`);

  let processed = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < tcodes.length; i += BATCH_SIZE) {
    const batch = tcodes.slice(i, i + BATCH_SIZE);
    const texts = batch.map(createEmbeddingText);

    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
      });

      // Store embeddings in database
      for (let j = 0; j < batch.length; j++) {
        const tcode = batch[j];
        const embedding = response.data[j].embedding;

        // Use raw SQL to update vector field
        await prisma.$executeRaw`
          UPDATE transaction_codes
          SET embedding = ${JSON.stringify(embedding)}::vector
          WHERE id = ${tcode.id}
        `;
      }

      processed += batch.length;

      // Progress logging
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const remaining = tcodes.length - processed;
      const eta = remaining / rate;

      console.log(
        `Progress: ${processed}/${tcodes.length} (${((processed / tcodes.length) * 100).toFixed(1)}%) - ` +
        `Rate: ${rate.toFixed(1)}/s - ETA: ${Math.round(eta)}s`
      );

      // Token usage
      if (response.usage) {
        console.log(`  Tokens used: ${response.usage.total_tokens}`);
      }
    } catch (error) {
      errors++;
      console.error(`Error processing batch starting at ${i}:`, error);

      // If rate limited, wait and retry
      if (error instanceof Error && error.message.includes('rate_limit')) {
        console.log('Rate limited, waiting 60 seconds...');
        await new Promise((resolve) => setTimeout(resolve, 60000));
        i -= BATCH_SIZE; // Retry this batch
      }
    }

    // Small delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\nEmbedding generation complete!`);
  console.log(`Processed: ${processed}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total time: ${totalTime.toFixed(1)}s`);

  // Verify embeddings
  const withEmbeddings = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM transaction_codes WHERE embedding IS NOT NULL
  `;
  console.log(`\nT-codes with embeddings: ${withEmbeddings[0].count}`);
}

async function main() {
  // Check if OpenAI API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }

  await generateEmbeddings();
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
