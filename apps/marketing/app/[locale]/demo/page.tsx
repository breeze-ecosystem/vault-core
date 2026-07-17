import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/src/i18n/routing';
import { Header } from '@/components/layout/header';
import { DemoTour } from '@/components/demo/demo-tour';
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
    title: 'Démo - OVERSIGHT AI',
    description:
      "Suivez un scénario de sécurité complet, étape par étape, et découvrez comment Oversight Hub unifie vidéo, contrôle d'accès et analyse IA.",
    alternates: {
      canonical: `https://oversighthub.com/${locale}/demo`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `https://oversighthub.com/${l}/demo`]),
      ),
    },
    openGraph: {
      title: 'Démo - OVERSIGHT AI',
      description:
        "Suivez un scénario de sécurité complet, étape par étape, et découvrez comment Oversight Hub unifie vidéo, contrôle d'accès et analyse IA.",
      url: `https://oversighthub.com/${locale}/demo`,
      siteName: 'Oversight AI',
      locale: locale === 'en' ? 'en_US' : locale === 'fr' ? 'fr_FR' : locale,
      type: 'website',
    },
  };
}

export default async function DemoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Header />
      <main>
        <DemoTour />
      </main>
      <Footer />
    </>
  );
}
