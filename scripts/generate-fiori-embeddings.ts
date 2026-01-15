import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI();

const BATCH_SIZE = 50; // Smaller batch for Fiori apps (longer text)
const EMBEDDING_MODEL = 'text-embedding-3-small';

interface FioriAppForEmbedding {
  id: number;
  appId: string;
  appName: string;
  appLauncherTitle: string | null;
  uiTechnology: string;
  appComponentDesc: string | null;
  lineOfBusiness: string[];
  businessCatalogTitle: string | null;
}

function createEmbeddingText(app: FioriAppForEmbedding): string {
  const parts = [app.appName];

  if (app.appLauncherTitle && app.appLauncherTitle !== app.appName) {
    parts.push(app.appLauncherTitle);
  }

  if (app.appComponentDesc) {
    parts.push(app.appComponentDesc);
  }

  parts.push(`UI: ${app.uiTechnology}`);

  if (app.lineOfBusiness.length > 0) {
    parts.push(`Business: ${app.lineOfBusiness.slice(0, 3).join(', ')}`);
  }

  if (app.businessCatalogTitle) {
    parts.push(app.businessCatalogTitle);
  }

  // Limit text length to avoid token limits
  const text = parts.join(' - ');
  return text.length > 1000 ? text.slice(0, 1000) : text;
}

async function generateEmbeddings() {
  console.log('Starting Fiori app embedding generation...');
  console.log(`Model: ${EMBEDDING_MODEL}`);
  console.log(`Batch size: ${BATCH_SIZE}`);

  // Get Fiori apps that need embeddings
  const apps = await prisma.$queryRaw<FioriAppForEmbedding[]>`
    SELECT id, app_id as "appId", app_name as "appName",
           app_launcher_title as "appLauncherTitle", ui_technology as "uiTechnology",
           app_component_desc as "appComponentDesc", line_of_business as "lineOfBusiness",
           business_catalog_title as "businessCatalogTitle"
    FROM fiori_apps
    WHERE embedding IS NULL
    ORDER BY id ASC
  `;

  console.log(`Found ${apps.length} Fiori apps to process`);

  if (apps.length === 0) {
    console.log('All Fiori apps already have embeddings!');
    return;
  }

  let processed = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < apps.length; i += BATCH_SIZE) {
    const batch = apps.slice(i, i + BATCH_SIZE);
    const texts = batch.map(createEmbeddingText);

    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
      });

      // Store embeddings in database
      for (let j = 0; j < batch.length; j++) {
        const app = batch[j];
        const embedding = response.data[j].embedding;

        // Use raw SQL to update vector field
        await prisma.$executeRaw`
          UPDATE fiori_apps
          SET embedding = ${JSON.stringify(embedding)}::vector
          WHERE id = ${app.id}
        `;
      }

      processed += batch.length;

      // Progress logging
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const remaining = apps.length - processed;
      const eta = remaining / rate;

      console.log(
        `Progress: ${processed}/${apps.length} (${((processed / apps.length) * 100).toFixed(1)}%) - ` +
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
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\nEmbedding generation complete!`);
  console.log(`Processed: ${processed}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total time: ${totalTime.toFixed(1)}s`);

  // Verify embeddings
  const withEmbeddings = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM fiori_apps WHERE embedding IS NOT NULL
  `;
  console.log(`\nFiori apps with embeddings: ${withEmbeddings[0].count}`);
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
