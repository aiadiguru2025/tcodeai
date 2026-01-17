import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface ProductVersionRow {
  'App ID': string;
  'Product version (Frontend) - Official Name': string;
}

async function main() {
  console.log('Starting product version update...');
  console.log('');

  // Parse CSV
  const csvPath = join(process.cwd(), 'Full_list(Product version).csv');
  const records: ProductVersionRow[] = [];

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

  // Build a map of appId -> productVersion
  const productVersionMap = new Map<string, string>();
  for (const row of records) {
    const appId = row['App ID']?.trim();
    const productVersion = row['Product version (Frontend) - Official Name']?.trim();

    if (appId && productVersion) {
      productVersionMap.set(appId, productVersion);
    }
  }

  console.log(`Built map with ${productVersionMap.size} unique app IDs`);
  console.log('');

  // Get all existing Fiori apps
  const existingApps = await prisma.fioriApp.findMany({
    select: { id: true, appId: true },
  });

  console.log(`Found ${existingApps.length} existing Fiori apps in database`);
  console.log('');

  // Update product versions
  let updatedCount = 0;
  let notFoundCount = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < existingApps.length; i += BATCH_SIZE) {
    const batch = existingApps.slice(i, i + BATCH_SIZE);

    for (const app of batch) {
      const productVersion = productVersionMap.get(app.appId);

      if (productVersion) {
        await prisma.fioriApp.update({
          where: { id: app.id },
          data: { productVersion },
        });
        updatedCount++;
      } else {
        notFoundCount++;
      }
    }

    // Progress update
    const progress = Math.min(i + BATCH_SIZE, existingApps.length);
    console.log(
      `Progress: ${progress}/${existingApps.length} (${Math.round((progress / existingApps.length) * 100)}%) - Updated: ${updatedCount}`
    );
  }

  console.log('');
  console.log('=== Update Complete ===');
  console.log(`Total apps in database: ${existingApps.length}`);
  console.log(`Apps updated with product version: ${updatedCount}`);
  console.log(`Apps without product version mapping: ${notFoundCount}`);

  // Show sample of product versions
  const sampleApps = await prisma.fioriApp.findMany({
    where: { productVersion: { not: null } },
    take: 5,
    select: { appId: true, appName: true, productVersion: true },
  });

  console.log('');
  console.log('Sample updated apps:');
  for (const app of sampleApps) {
    console.log(`  ${app.appId}: ${app.productVersion}`);
  }

  // Count by product version
  const versionCounts = await prisma.$queryRaw<{ product_version: string; count: bigint }[]>`
    SELECT product_version, COUNT(*) as count
    FROM fiori_apps
    WHERE product_version IS NOT NULL
    GROUP BY product_version
    ORDER BY count DESC
    LIMIT 10
  `;

  console.log('');
  console.log('Product version distribution (top 10):');
  for (const { product_version, count } of versionCounts) {
    console.log(`  ${product_version}: ${count}`);
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
