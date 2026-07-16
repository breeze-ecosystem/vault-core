import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/src/i18n/routing';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { BlogPostLayout } from '@/components/blog/blog-post-layout';
import { CTASection } from '@/components/landing/cta-section';
import {
  getPostsByLocale,
  getPostBySlug,
  getAllSlugsByLocale,
} from '@/src/lib/velite';
import { BlogPostingJsonLd, BreadcrumbListJsonLd } from '@/src/lib/seo';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  const slugsByLocale = getAllSlugsByLocale();

  return routing.locales.flatMap((locale) => {
    const slugs = slugsByLocale[locale] ?? [];
    return slugs.map((slug) => ({ locale, slug }));
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(locale, slug);

  if (!post) {
    return { title: 'Post Not Found - OVERSIGHT AI' };
  }

  return {
    title: `${post.title} - OVERSIGHT AI`,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} - OVERSIGHT AI`,
      description: post.excerpt,
      url: `https://oversighthub.com/${locale}/blog/${slug}`,
      siteName: 'Oversight AI',
      locale: locale === 'en' ? 'en_US' : locale === 'fr' ? 'fr_FR' : locale,
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
    },
    alternates: {
      canonical: `https://oversighthub.com/${locale}/blog/${slug}`,
    },
  };
}

export const revalidate = 600;

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = getPostBySlug(locale, slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getPostsByLocale(locale);

  const postUrl = `https://oversighthub.com/${locale}/blog/${slug}`;

  return (
    <>
      <BlogPostingJsonLd
        headline={post.title}
        description={post.excerpt}
        datePublished={post.date}
        author="Oversight AI Team"
        image={post.cover?.src}
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: `https://oversighthub.com/${locale}` },
          { name: 'Blog', url: `https://oversighthub.com/${locale}/blog` },
          { name: post.title, url: postUrl },
        ]}
      />
      <Header />
      <main>
        <Section variant="default" className="!py-12 md:!py-20">
          <Container className="max-w-4xl">
            <BlogPostLayout post={post} relatedPosts={relatedPosts} />
          </Container>
        </Section>

        <CTASection />
      </main>
      <Footer />
    </>
  );
}
