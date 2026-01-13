import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Focus on high-confidence relationships only:
// 1. N-suffix variants (ME21 <-> ME21N) - New GUI versions
// 2. Create/Change/Display triplets (VA01, VA02, VA03)

async function main() {
  console.log('Starting relationship detection (focused mode)...');

  // Get all T-codes with descriptions (skip IMG activities)
  const tcodes = await prisma.transactionCode.findMany({
    where: {
      description: { not: null },
      NOT: { program: 'SAPLS_CUS_IMG_ACTIVITY' },
    },
    select: { id: true, tcode: true, description: true },
  });

  console.log(`Processing ${tcodes.length} T-codes with descriptions...`);

  const tcodeMap = new Map(tcodes.map((t) => [t.tcode, t]));
  const relationships: {
    sourceTcodeId: number;
    targetTcodeId: number;
    relationshipType: string;
    confidence: number;
  }[] = [];

  for (const tcode of tcodes) {
    // 1. Detect N-suffix variants (ME21 <-> ME21N)
    if (tcode.tcode.endsWith('N') && tcode.tcode.length >= 3) {
      const baseTcode = tcode.tcode.slice(0, -1);
      const baseEntry = tcodeMap.get(baseTcode);
      if (baseEntry) {
        relationships.push({
          sourceTcodeId: baseEntry.id,
          targetTcodeId: tcode.id,
          relationshipType: 'successor',
          confidence: 0.95,
        });
      }
    }

    // 2. Detect Create/Change/Display patterns
    // Match patterns like VA01, VA02, VA03 or FB01, FB02, FB03
    const match = tcode.tcode.match(/^([A-Z]{2,4})0([123])$/);
    if (match) {
      const [, prefix, action] = match;
      const actionNum = parseInt(action, 10);

      // Find the other two in the triplet
      for (const otherAction of [1, 2, 3]) {
        if (otherAction !== actionNum) {
          const otherTcode = `${prefix}0${otherAction}`;
          const otherEntry = tcodeMap.get(otherTcode);
          if (otherEntry && tcode.tcode < otherTcode) {
            relationships.push({
              sourceTcodeId: tcode.id,
              targetTcodeId: otherEntry.id,
              relationshipType: 'related',
              confidence: 0.9,
            });
          }
        }
      }
    }

    // 3. Also check 21/22/23 pattern (ME21N, ME22N, ME23N)
    const matchN = tcode.tcode.match(/^([A-Z]{2})2([123])N?$/);
    if (matchN) {
      const [, prefix, action] = matchN;
      const suffix = tcode.tcode.endsWith('N') ? 'N' : '';
      const actionNum = parseInt(action, 10);

      for (const otherAction of [1, 2, 3]) {
        if (otherAction !== actionNum) {
          const otherTcode = `${prefix}2${otherAction}${suffix}`;
          const otherEntry = tcodeMap.get(otherTcode);
          if (otherEntry && tcode.tcode < otherTcode) {
            relationships.push({
              sourceTcodeId: tcode.id,
              targetTcodeId: otherEntry.id,
              relationshipType: 'related',
              confidence: 0.9,
            });
          }
        }
      }
    }
  }

  console.log(`Found ${relationships.length} high-confidence relationships`);

  // Clear existing relationships
  await prisma.tCodeRelationship.deleteMany({});
  console.log('Cleared existing relationships');

  // Insert relationships
  if (relationships.length > 0) {
    const result = await prisma.tCodeRelationship.createMany({
      data: relationships,
      skipDuplicates: true,
    });
    console.log(`Inserted ${result.count} relationships`);
  }

  // Print sample relationships
  const samples = await prisma.tCodeRelationship.findMany({
    take: 15,
    include: {
      sourceTcode: { select: { tcode: true, description: true } },
      targetTcode: { select: { tcode: true, description: true } },
    },
  });

  console.log('\nSample relationships:');
  for (const rel of samples) {
    console.log(
      `  ${rel.sourceTcode.tcode} (${rel.sourceTcode.description?.slice(0, 30)}...) --[${rel.relationshipType}]--> ${rel.targetTcode.tcode}`
    );
  }

  // Count by type
  const counts = await prisma.tCodeRelationship.groupBy({
    by: ['relationshipType'],
    _count: { relationshipType: true },
  });
  console.log('\nRelationship counts by type:');
  counts.forEach((c) => console.log(`  ${c.relationshipType}: ${c._count.relationshipType}`));
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
