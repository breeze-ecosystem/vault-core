import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/src/i18n/routing';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { AnimatedSection } from '@/components/ui/animated-section';
import { BlogGrid } from '@/components/blog/blog-grid';
import { BlogCategoryFilter } from '@/components/blog/blog-category-filter';
import { BlogPagination } from '@/components/blog/blog-pagination';
import { CTASection } from '@/components/landing/cta-section';
import { getPostsByLocale, getCategoriesByLocale } from '@/src/lib/velite';
import { BlogIndexClient } from './blog-index-client';

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: 'Blog - OVERSIGHT AI',
    description:
      'Security insights, product updates, and changelog from the Oversight Hub team.',
    alternates: {
      canonical: `https://oversighthub.com/${locale}/blog`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `https://oversighthub.com/${l}/blog`]),
      ),
    },
    openGraph: {
      title: 'Blog - OVERSIGHT AI',
      description:
        'Security insights, product updates, and changelog from the Oversight Hub team.',
      url: `https://oversighthub.com/${locale}/blog`,
      siteName: 'Oversight AI',
      locale: locale === 'en' ? 'en_US' : locale === 'fr' ? 'fr_FR' : locale,
      type: 'website',
    },
  };
}

export const revalidate = 600;

export default async function BlogIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const posts = getPostsByLocale(locale);
  const categories = getCategoriesByLocale(locale);

  return (
    <>
      <Header />
      <main>
        {/* Page Heading */}
        <Section variant="dark" className="!pb-0">
          <Container>
            <PageHeader
              heading="Blog"
              subheading="Security insights, product updates, and changelog"
            />
          </Container>
        </Section>

        {/* Category Filter + Grid */}
        <Section variant="default">
          <Container>
            {posts.length === 0 ? (
              <AnimatedSection>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-6 text-muted-light">
                    <svg
                      className="mx-auto h-16 w-16"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                  </div>
                  <h2 className="mb-2 text-2xl font-semibold text-foreground">
                    No posts yet
                  </h2>
                  <p className="max-w-md text-muted">
                    Check back soon for security insights, product updates, and
                    changelog entries.
                  </p>
                </div>
              </AnimatedSection>
            ) : (
              <AnimatedSection>
                <BlogIndexClient
                  posts={posts}
                  categories={categories}
                  locale={locale}
                />
              </AnimatedSection>
            )}
          </Container>
        </Section>

        {/* CTA */}
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
