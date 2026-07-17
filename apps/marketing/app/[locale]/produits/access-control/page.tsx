import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { IdCard, DoorOpen, Shield, History } from 'lucide-react';
import { routing } from '@/src/i18n/routing';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { ProductDetailLayout } from '@/components/products/product-detail-layout';
import { GlassPanel } from '@/components/shared/glass-panel';
import { AnimatedSection } from '@/components/ui/animated-section';
import { CTASection } from '@/components/landing/cta-section';

type Props = {
  params: Promise<{ locale: string }>;
};

const featureIcons = [IdCard, DoorOpen, Shield, History];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: "Contrôle d'accès - OVERSIGHT AI",
    description:
      "Gérez les badges, les portes et les zones d'accès depuis un tableau de bord centralisé avec des règles dynamiques.",
    alternates: {
      canonical: `https://oversighthub.com/${locale}/produits/access-control`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `https://oversighthub.com/${l}/produits/access-control`]),
      ),
    },
    openGraph: {
      title: "Contrôle d'accès - OVERSIGHT AI",
      description:
        "Gérez les badges, les portes et les zones d'accès depuis un tableau de bord centralisé avec des règles dynamiques.",
      url: `https://oversighthub.com/${locale}/produits/access-control`,
      siteName: 'Oversight AI',
      locale: locale === 'en' ? 'en_US' : locale === 'fr' ? 'fr_FR' : locale,
      type: 'website',
    },
  };
}

export default async function AccessControlPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'produits.accessControl' });

  return (
    <>
      <Header />
      <main>
        <ProductDetailLayout title={t('name')} description={t('description')}>
          <Section>
            <Container>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {t.raw('features').map((feature: string, i: number) => {
                  const Icon = featureIcons[i] || Shield;
                  return (
                    <AnimatedSection key={feature} delay={i * 0.1}>
                      <GlassPanel className="flex items-start gap-4 p-6">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-[#f1f5f9]">
                            {feature}
                          </p>
                        </div>
                      </GlassPanel>
                    </AnimatedSection>
                  );
                })}
              </div>
            </Container>
          </Section>
        </ProductDetailLayout>
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
