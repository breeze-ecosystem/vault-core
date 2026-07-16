import type { MetadataRoute } from 'next';

const BASE_URL = 'https://oversighthub.com';
const LOCALES = ['en', 'fr', 'es', 'de', 'ja', 'ar'] as const;

type Locale = (typeof LOCALES)[number];

/**
 * Build hreflang alternates object for a given path pattern.
 * Format: { [locale]: "https://oversighthub.com/{locale}/..." }
 */
function alternatesForPath(path: string): Record<string, string> {
  const alts: Record<string, string> = {};
  for (const locale of LOCALES) {
    alts[locale] = `${BASE_URL}/${locale}${path}`;
  }
  // x-default points to English
  alts['x-default'] = `${BASE_URL}/en${path}`;
  return alts;
}

/**
 * Sitemap generator with per-locale entries and hreflang annotations.
 *
 * Uses Next.js 14 App Router built-in sitemap generation.
 * Returns an array of sitemap entries with alternates.languages for hreflang.
 *
 * Per UI-SPEC D-26: JSON-LD sitemap strategy with per-locale entries,
 * cross-locale hreflang annotations, and x-default pointing to English.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages per locale
  for (const locale of LOCALES) {
    const alts = alternatesForPath('');
    const langAlts: Record<string, string> = {};
    for (const l of LOCALES) {
      if (alts[l]) langAlts[l] = alts[l];
    }
    langAlts['x-default'] = `${BASE_URL}/en`;

    // Landing page
    entries.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: langAlts,
      },
    });

    // Pricing page
    entries.push({
      url: `${BASE_URL}/${locale}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: {
        languages: (() => {
          const pricingAlts: Record<string, string> = {};
          for (const l of LOCALES) {
            pricingAlts[l] = `${BASE_URL}/${l}/pricing`;
          }
          pricingAlts['x-default'] = `${BASE_URL}/en/pricing`;
          return pricingAlts;
        })(),
      },
    });

    // Blog index
    entries.push({
      url: `${BASE_URL}/${locale}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: (() => {
          const blogAlts: Record<string, string> = {};
          for (const l of LOCALES) {
            blogAlts[l] = `${BASE_URL}/${l}/blog`;
          }
          blogAlts['x-default'] = `${BASE_URL}/en/blog`;
          return blogAlts;
        })(),
      },
    });
  }

  // Blog posts - query velite content to get all slugs per locale
  try {
    const { getAllSlugsByLocale } = await import('@/src/lib/velite');
    const slugsByLocale = getAllSlugsByLocale();

    for (const locale of LOCALES) {
      const slugs = slugsByLocale[locale] ?? [];

      for (const slug of slugs) {
        entries.push({
          url: `${BASE_URL}/${locale}/blog/${slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
          alternates: {
            languages: (() => {
              const postAlts: Record<string, string> = {};
              for (const l of LOCALES) {
                postAlts[l] = `${BASE_URL}/${l}/blog/${slug}`;
              }
              postAlts['x-default'] = `${BASE_URL}/en/blog/${slug}`;
              return postAlts;
            })(),
          },
        });
      }
    }
  } catch {
    // Velite content may not be generated during dev
    // Skip blog post entries gracefully
  }

  return entries;
}
