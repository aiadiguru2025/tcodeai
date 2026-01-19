import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Additional aliases for common country name variations
const COUNTRY_ALIASES: Record<number, string[]> = {
  1: ['Deutschland', 'German'],
  2: ['Swiss', 'Schweiz'],
  3: ['Austrian', 'Österreich'],
  4: ['Spanish', 'España'],
  5: ['Dutch', 'Holland', 'Nederland'],
  6: ['French', 'Français'],
  7: ['Canadian'],
  8: ['UK', 'United Kingdom', 'England', 'British', 'Britain'],
  9: ['Danish', 'Danmark'],
  10: ['USA', 'United States', 'US', 'America', 'American', 'United States of America'],
  11: ['Irish'],
  12: ['Belgian', 'Belgique'],
  13: ['Australian', 'Aussie'],
  14: ['Malaysian'],
  15: ['Italian', 'Italia'],
  16: ['South African', 'SA'],
  17: ['Venezuelan'],
  18: ['Czech', 'Czechia'],
  19: ['Portuguese', 'Portugal'],
  20: ['Norwegian', 'Norge'],
  21: ['Hungarian', 'Magyar'],
  22: ['Japanese', 'Nippon', '日本'],
  23: ['Swedish', 'Sverige'],
  24: ['Saudi', 'KSA', 'Kingdom of Saudi Arabia'],
  25: ['Singaporean'],
  26: ['Thai'],
  27: ['HK', 'Chinese Hong Kong'],
  28: ['Chinese', 'PRC', "People's Republic of China", '中国'],
  29: ['Argentine', 'Argentinian'],
  30: ['Luxembourgish'],
  31: ['Slovak'],
  32: ['Mexican', 'México'],
  33: ['Russian', 'Россия'],
  34: ['Indonesian'],
  35: ['Bruneian'],
  36: ['Ukrainian', 'Україна'],
  37: ['Brazilian', 'Brasil'],
  38: ['Colombian'],
  39: ['Chilean'],
  40: ['Indian', 'Bharat', 'भारत'],
  41: ['Korean', 'South Korean', 'ROK', 'Republic of Korea', '한국'],
  42: ['Taiwanese', '台灣'],
  43: ['NZ', 'Kiwi', 'New Zealander'],
  44: ['Finnish', 'Suomi'],
  45: ['Greek', 'Hellas', 'Ελλάδα'],
  46: ['Polish', 'Polska'],
  47: ['Turkish', 'Türkiye'],
  48: ['Filipino', 'Pilipinas'],
  49: ['Namibian'],
  50: ['Basotho'],
  51: ['Batswana', 'Motswana'],
  52: ['Swazi', 'Eswatini'],
  53: ['Mozambican'],
  54: ['Kenyan'],
  55: ['Angolan'],
  56: ['Zimbabwean'],
  57: ['Antillean', 'Netherlands Antilles'],
  58: ['Croatian', 'Hrvatska'],
  60: ['Icelandic', 'Ísland'],
  61: ['Romanian', 'România'],
  62: ['Slovenian', 'Slovenija'],
  99: ['International', 'Global', 'Worldwide', 'Multi-country'],
};

async function seedMolga() {
  console.log('Reading MOLGA.csv...');

  const csvPath = path.join(process.cwd(), 'MOLGA.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV (skip header, handle BOM)
  const lines = csvContent.replace(/^\uFEFF/, '').split('\n').slice(1);

  const molgaData = lines
    .filter(line => line.trim())
    .map(line => {
      const [molga, isoCode, country] = line.split(',').map(s => s.trim());
      const molgaNum = parseInt(molga, 10);

      return {
        molga: molgaNum,
        isoCode,
        country,
        aliases: COUNTRY_ALIASES[molgaNum] || [],
      };
    });

  console.log(`Parsed ${molgaData.length} MOLGA entries`);

  // Upsert each entry
  for (const entry of molgaData) {
    await prisma.molga.upsert({
      where: { molga: entry.molga },
      update: {
        isoCode: entry.isoCode,
        country: entry.country,
        aliases: entry.aliases,
      },
      create: entry,
    });
    console.log(`  ✓ MOLGA ${entry.molga}: ${entry.country} (${entry.isoCode})`);
  }

  console.log('\nMOLGA seeding complete!');

  // Verify
  const count = await prisma.molga.count();
  console.log(`Total MOLGA entries in database: ${count}`);
}

seedMolga()
  .catch((e) => {
    console.error('Error seeding MOLGA:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
