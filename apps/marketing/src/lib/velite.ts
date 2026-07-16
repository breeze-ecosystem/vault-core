import { posts as allPosts } from '../../.velite';

export type Post = (typeof allPosts)[number];

export function getPostsByLocale(locale: string) {
  return allPosts
    .filter((post) => post.locale === locale)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(locale: string, slug: string) {
  return allPosts.find((post) => post.locale === locale && post.slug === slug);
}

export function getAllSlugsByLocale() {
  const slugs: Record<string, string[]> = {};
  for (const post of allPosts) {
    if (!slugs[post.locale]) slugs[post.locale] = [];
    slugs[post.locale].push(post.slug);
  }
  return slugs;
}

export function getCategoriesByLocale(locale: string): string[] {
  const categories = new Set<string>();
  for (const post of allPosts) {
    if (post.locale === locale && post.category) {
      categories.add(post.category);
    }
  }
  return Array.from(categories).sort();
}
