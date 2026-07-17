import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Video, Key, Brain, BarChart3 } from 'lucide-react';
import { routing } from '@/src/i18n/routing';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { ProductsHero } from '@/components/products/products-hero';
import { ProductGrid } from '@/components/products/product-grid';
import { CTASection } from '@/components/landing/cta-section';

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: 'Produits - OVERSIGHT AI',
    description:
      "Découvrez nos solutions de sécurité physique : vidéo intelligence, contrôle d'accès, analytique IA et rapports.",
    alternates: {
      canonical: `https://oversighthub.com/${locale}/produits`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `https://oversighthub.com/${l}/produits`]),
      ),
    },
    openGraph: {
      title: 'Produits - OVERSIGHT AI',
      description:
        "Découvrez nos solutions de sécurité physique : vidéo intelligence, contrôle d'accès, analytique IA et rapports.",
      url: `https://oversighthub.com/${locale}/produits`,
      siteName: 'Oversight AI',
      locale: locale === 'en' ? 'en_US' : locale === 'fr' ? 'fr_FR' : locale,
      type: 'website',
    },
  };
}

export default async function ProduitsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'produits' });

  const products = [
    {
      title: t('video.name'),
      description: t('video.description'),
      href: `/${locale}/produits/video`,
      icon: <Video className="h-6 w-6" />,
    },
    {
      title: t('accessControl.name'),
      description: t('accessControl.description'),
      href: `/${locale}/produits/access-control`,
      icon: <Key className="h-6 w-6" />,
    },
    {
      title: t('aiAnalytics.name'),
      description: t('aiAnalytics.description'),
      href: `/${locale}/produits/ai-analytics`,
      icon: <Brain className="h-6 w-6" />,
    },
    {
      title: t('analytics.name'),
      description: t('analytics.description'),
      href: `/${locale}/produits/analytics`,
      icon: <BarChart3 className="h-6 w-6" />,
    },
  ];

  return (
    <>
      <Header />
      <main>
        <ProductsHero />
        <Section>
          <Container>
            <ProductGrid products={products} />
          </Container>
        </Section>
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
