import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/src/i18n/routing';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CTASection } from '@/components/landing/cta-section';
import { SolutionsHero } from '@/components/solutions/solution-hero';
import { SolutionGrid } from '@/components/solutions/solution-grid';

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Solutions - OVERSIGHT AI',
    description: 'Solutions sectorielles de sécurité physique pour campus d\'entreprise et infrastructures critiques.',
    alternates: { canonical: `https://oversighthub.com/${locale}/solutions` },
  };
}

export default async function SolutionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'solutions' });

  const solutions = [
    {
      title: t('enterprise.name'),
      description: t('enterprise.description'),
      href: `/${locale}/solutions/enterprise-campuses`,
      industry: t('enterprise.name'),
    },
    {
      title: t('critical.name'),
      description: t('critical.description'),
      href: `/${locale}/solutions/critical-infrastructure`,
      industry: t('critical.name'),
    },
  ];

  return (
    <>
      <Header />
      <main>
        <SolutionsHero />
        <section className="bg-[#0c1020] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SolutionGrid solutions={solutions} />
          </div>
        </section>
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
