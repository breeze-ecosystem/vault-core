import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/src/i18n/routing';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CaseStudyLayout } from '@/components/case-studies/case-study-layout';
import { MDXContent } from '@/components/mdx-content';
import { CTASection } from '@/components/landing/cta-section';
import {
  getCaseStudiesByLocale,
  getCaseStudyBySlug,
  getCaseStudySlugsByLocale,
} from '@/src/lib/velite';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  const slugsByLocale = getCaseStudySlugsByLocale();

  return routing.locales.flatMap((locale) => {
    const slugs = slugsByLocale[locale] ?? [];
    return slugs.map((slug) => ({ locale, slug }));
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const study = getCaseStudyBySlug(locale, slug);

  if (!study) {
    return { title: 'Étude de cas non trouvée - OVERSIGHT AI' };
  }

  return {
    title: `${study.title} - OVERSIGHT AI`,
    description: study.excerpt,
    openGraph: {
      title: `${study.title} - OVERSIGHT AI`,
      description: study.excerpt,
      url: `https://oversighthub.com/${locale}/etudes-de-cas/${slug}`,
      siteName: 'Oversight AI',
      locale: locale === 'en' ? 'en_US' : locale === 'fr' ? 'fr_FR' : locale,
      type: 'article',
      publishedTime: study.date,
    },
    alternates: {
      canonical: `https://oversighthub.com/${locale}/etudes-de-cas/${slug}`,
    },
  };
}

export default async function CaseStudyDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const study = getCaseStudyBySlug(locale, slug);

  if (!study) {
    notFound();
  }

  const results = study.results?.map((r: { metric: string; value: string }) => ({
    metric: r.metric,
    value: r.value,
  }));

  return (
    <>
      <Header />
      <main>
        <CaseStudyLayout
          title={study.title}
          client={study.client}
          industry={study.industry}
          results={results}
        >
          <MDXContent code={study.content} />
        </CaseStudyLayout>

        <CTASection />
      </main>
      <Footer />
    </>
  );
}
