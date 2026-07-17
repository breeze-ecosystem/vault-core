import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/src/i18n/routing';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { CaseStudyGrid } from '@/components/case-studies/case-study-grid';
import { CTASection } from '@/components/landing/cta-section';
import { getCaseStudiesByLocale } from '@/src/lib/velite';

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: 'Études de cas - OVERSIGHT AI',
    description:
      'Découvrez comment les organisations utilisent Oversight Hub pour transformer leur sécurité physique.',
    alternates: {
      canonical: `https://oversighthub.com/${locale}/etudes-de-cas`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `https://oversighthub.com/${l}/etudes-de-cas`]),
      ),
    },
    openGraph: {
      title: 'Études de cas - OVERSIGHT AI',
      description:
        'Découvrez comment les organisations utilisent Oversight Hub pour transformer leur sécurité physique.',
      url: `https://oversighthub.com/${locale}/etudes-de-cas`,
      siteName: 'Oversight AI',
      locale: locale === 'en' ? 'en_US' : locale === 'fr' ? 'fr_FR' : locale,
      type: 'website',
    },
  };
}

export default async function CaseStudiesIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const studies = getCaseStudiesByLocale(locale);

  const caseStudies = studies.map((study) => ({
    title: study.title,
    excerpt: study.excerpt,
    slug: study.slug,
    industry: study.industry,
    client: study.client,
  }));

  return (
    <>
      <Header />
      <main>
        {/* Page Heading */}
        <Section variant="dark" className="pt-32 pb-16">
          <Container>
            <div className="max-w-3xl">
              <h1 className="font-display text-[32px] text-[#f1f5f9]">
                Études de cas
              </h1>
              <p className="mt-4 text-lg text-[#94a3b8]">
                Découvrez comment les organisations utilisent Oversight Hub pour
                transformer leur sécurité physique.
              </p>
            </div>
          </Container>
        </Section>

        {/* Case Study Grid */}
        <Section variant="alt">
          <Container>
            <CaseStudyGrid caseStudies={caseStudies} />
          </Container>
        </Section>

        {/* CTA */}
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
