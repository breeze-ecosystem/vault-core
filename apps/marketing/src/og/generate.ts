/**
 * Build-time OG image generator.
 *
 * Usage: npx tsx src/og/generate.ts
 *
 * Generates static OG PNG images for landing, pricing, and blog index
 * and saves them to public/og/.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateOGImage } from './template';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, '../../public/og');

const pages: Array<{ title: string; category: 'landing' | 'pricing' | 'blog'; filename: string }> = [
  {
    title: 'AI-Powered Physical Security Intelligence',
    category: 'landing',
    filename: 'landing-og.png',
  },
  {
    title: 'Simple, transparent pricing — Start with a free trial. No credit card required.',
    category: 'pricing',
    filename: 'pricing-og.png',
  },
  {
    title: 'Security insights, product updates, and changelog',
    category: 'blog',
    filename: 'blog-og.png',
  },
];

async function main() {
  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  for (const page of pages) {
    console.log(`Generating ${page.filename}...`);
    const png = await generateOGImage({ title: page.title, category: page.category });
    const filePath = path.join(OUTPUT_DIR, page.filename);
    await fs.writeFile(filePath, png);
    const stats = await fs.stat(filePath);
    console.log(`  → ${filePath} (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  console.log('\nAll OG images generated successfully.');
}

main().catch((err) => {
  console.error('OG image generation failed:', err);
  process.exit(1);
});
