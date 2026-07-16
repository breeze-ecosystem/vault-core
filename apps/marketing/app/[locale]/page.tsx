import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/src/i18n/routing';
import { Header } from '@/components/layout/header';
import { HeroSection } from '@/components/landing/hero-section';
import { TrustBar } from '@/components/landing/trust-bar';
import { FeatureShowcase } from '@/components/landing/feature-showcase';
import { AIHighlightSection } from '@/components/landing/ai-highlight-section';
import { TestimonialCarousel } from '@/components/landing/testimonial-carousel';
import { StatsSection } from '@/components/landing/stats-section';
import { CTASection } from '@/components/landing/cta-section';
import { Footer } from '@/components/layout/footer';

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: 'OVERSIGHT AI - AI-Powered Physical Security Intelligence',
    description:
      'Correlate every access event, door alert, and camera feed in one unified platform with real-time AI analysis.',
    alternates: {
      canonical: `https://oversighthub.com/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `https://oversighthub.com/${l}`]),
      ),
    },
    openGraph: {
      title: 'OVERSIGHT AI - AI-Powered Physical Security Intelligence',
      description:
        'Correlate every access event, door alert, and camera feed in one unified platform with real-time AI analysis.',
      url: `https://oversighthub.com/${locale}`,
      siteName: 'Oversight AI',
      locale: locale === 'en' ? 'en_US' : locale === 'fr' ? 'fr_FR' : locale,
      type: 'website',
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <TrustBar />
        <FeatureShowcase />
        <AIHighlightSection />
        <TestimonialCarousel />
        <StatsSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
