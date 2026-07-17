import { posts as allPosts, caseStudies as allCaseStudies } from '../../.velite';

export type Post = (typeof allPosts)[number];
export type CaseStudy = (typeof allCaseStudies)[number];

export function getPostsByLocale(locale: string) {
  return allPosts
    .filter((post) => post.locale === locale)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) as Post[];
}

export function getPostBySlug(locale: string, slug: string) {
  return allPosts.find((post) => post.locale === locale && post.slug === slug) as Post | undefined;
}

export function getAllSlugsByLocale() {
  const slugs: Record<string, string[]> = {};
  for (const post of allPosts) {
    if (!slugs[post.locale]) slugs[post.locale] = [];
    slugs[post.locale]!.push(post.slug);
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

export function getCaseStudiesByLocale(locale: string) {
  return allCaseStudies
    .filter((cs) => cs.locale === locale)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) as CaseStudy[];
}

export function getCaseStudyBySlug(locale: string, slug: string) {
  return allCaseStudies.find((cs) => cs.locale === locale && cs.slug === slug) as CaseStudy | undefined;
}

export function getCaseStudySlugsByLocale() {
  const slugs: Record<string, string[]> = {};
  for (const cs of allCaseStudies) {
    if (!slugs[cs.locale]) slugs[cs.locale] = [];
    slugs[cs.locale]!.push(cs.slug);
  }
  return slugs;
}
