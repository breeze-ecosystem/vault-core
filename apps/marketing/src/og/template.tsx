/**
 * Build-time OG image template using satori (JSX → SVG → PNG).
 *
 * This module runs at build time via src/og/generate.ts.
 * It is NOT part of the Next.js server bundle.
 *
 * Based on RESEARCH.md lines 438-493.
 */

import satori from 'satori';
import sharp from 'sharp';

export type OGTemplateProps = {
  title: string;
  category: 'landing' | 'pricing' | 'blog';
};

/**
 * Generate a PNG OG image (1200×630) for the given page category.
 * Fetches Inter font at build time, renders via satori, converts via sharp.
 */
export async function generateOGImage({
  title,
  category,
}: OGTemplateProps): Promise<Buffer> {
  // Fetch Inter font (regular + bold) for satori rendering
  const [interRegular, interBold] = await Promise.all([
    fetch(
      'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Regular.woff',
    ).then((r) => r.arrayBuffer()),
    fetch(
      'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Bold.woff',
    ).then((r) => r.arrayBuffer()),
  ]);

  // Category label
  const categoryLabel =
    category === 'landing'
      ? 'OVERSIGHT AI'
      : category === 'pricing'
        ? 'PRICING'
        : 'BLOG';

  const svg = await satori(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 1200,
        height: 630,
        background: 'linear-gradient(135deg, #070912 0%, #155e75 50%, #06b6d4 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter',
        padding: 60,
      }}
    >
      {/* Category badge */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: 40,
          left: 60,
          color: '#22d3ee',
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '0.1em',
        }}
      >
        {categoryLabel}
      </div>

      {/* Title */}
      <h1
        style={{
          color: '#ffffff',
          fontSize: 56,
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.2,
          margin: 0,
          maxWidth: 900,
        }}
      >
        {title}
      </h1>

      {/* Brand */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          bottom: 40,
          left: 60,
          color: '#94a3b8',
          fontSize: 18,
        }}
      >
        oversighthub.com
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: interRegular,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: interBold,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  );

  // Convert SVG to PNG via sharp
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return png;
}
