import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/src/i18n/routing';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CTASection } from '@/components/landing/cta-section';
import { SolutionDetailLayout } from '@/components/solutions/solution-detail-layout';
import { GlassPanel } from '@/components/shared/glass-panel';
import { AnimatedSection } from '@/components/ui/animated-section';

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Campus d'entreprise - Solutions - OVERSIGHT AI",
    description:
      "Sécurisez vos campus multi-bâtiments avec Oversight Hub — vidéo, contrôle d'accès et IA unifiés.",
    alternates: {
      canonical: `https://oversighthub.com/${locale}/solutions/enterprise-campuses`,
    },
  };
}

export default async function EnterpriseCampusesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'solutions.enterprise' });

  const challenges = t.raw('challenges') as string[];
  const outcomes = t.raw('outcomes') as string[];

  return (
    <>
      <Header />
      <main>
        <SolutionDetailLayout
          title={t('name')}
          description={t('description')}
          challenges={challenges}
          outcomes={outcomes}
        >
          {/* Why Oversight Hub section */}
          <AnimatedSection>
            <h2 className="font-display text-[28px] text-[#f1f5f9]">
              Pourquoi Oversight Hub
            </h2>
            <p className="mt-4 leading-relaxed text-[#94a3b8]">
              Les campus d'entreprise multi-bâtiments posent des défis uniques
              de coordination, de conformité et de contrôle d'accès. Oversight
              Hub unifie l'ensemble dans une plateforme unique.
            </p>
          </AnimatedSection>

          <div className="mt-8 space-y-6">
            <AnimatedSection delay={0.1}>
              <GlassPanel className="p-6">
                <h3 className="font-display text-lg text-white">
                  Vidéo unifiée multi-sites
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
                  Visualisez l'ensemble de vos caméras depuis un seul tableau de
                  bord, quel que soit le site. Corrélez les événements entre
                  bâtiments avec l'analyse IA automatique.
                </p>
              </GlassPanel>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <GlassPanel className="p-6">
                <h3 className="font-display text-lg text-white">
                  Contrôle d'accès centralisé
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
                  Gérez les badges, les portes et les zones d'accès de tous vos
                  bâtiments depuis un point central. Appliquez des règles
                  dynamiques par site, par étage ou par zone.
                </p>
              </GlassPanel>
            </AnimatedSection>

            <AnimatedSection delay={0.3}>
              <GlassPanel className="p-6">
                <h3 className="font-display text-lg text-white">
                  Conformité et reporting
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
                  Générez automatiquement des rapports de conformité pour chaque
                  site. L'historique d'accès immuable et les journaux d'audit
                  simplifient les audits réglementaires.
                </p>
              </GlassPanel>
            </AnimatedSection>
          </div>

          {/* Case study teaser */}
          <AnimatedSection delay={0.4}>
            <div className="mt-16 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-cyan-500/10 to-transparent p-px">
              <div className="rounded-2xl bg-[#0c1020] p-8">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  Étude de cas
                </span>
                <h3 className="mt-3 font-display text-xl text-white">
                  Siège social international — 15 000 employés
                </h3>
                <p className="mt-3 leading-relaxed text-[#94a3b8]">
                  Comment un groupe industriel mondial a sécurisé 12 bâtiments
                  sur 3 continents avec une plateforme unifiée Oversight Hub.
                </p>
                <Link
                  href={`/${locale}/etudes-de-cas`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 transition-all duration-200 hover:gap-2.5"
                >
                  Lire l'étude complète
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </SolutionDetailLayout>

        <CTASection />
      </main>
      <Footer />
    </>
  );
}
