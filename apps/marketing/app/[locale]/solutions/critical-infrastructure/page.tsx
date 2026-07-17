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
    title: 'Infrastructure critique - Solutions - OVERSIGHT AI',
    description:
      'Protégez vos sites sensibles avec une sécurité physique renforcée et une surveillance IA continue.',
    alternates: {
      canonical: `https://oversighthub.com/${locale}/solutions/critical-infrastructure`,
    },
  };
}

export default async function CriticalInfrastructurePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'solutions.critical' });

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
              Les infrastructures critiques exigent le plus haut niveau de
              sécurité physique. Oversight Hub fournit une surveillance continue,
              une détection des menaces en temps réel et une conformité
              réglementaire automatisée.
            </p>
          </AnimatedSection>

          <div className="mt-8 space-y-6">
            <AnimatedSection delay={0.1}>
              <GlassPanel className="p-6">
                <h3 className="font-display text-lg text-white">
                  Surveillance IA 24/7
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
                  L'analyse vidéo en temps réel détête automatiquement les
                  intrusions, les comportements suspects et les anomalies.
                  Alertes instantanées avec extraits vidéo pour une réponse rapide.
                </p>
              </GlassPanel>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <GlassPanel className="p-6">
                <h3 className="font-display text-lg text-white">
                  Contrôle d'accès renforcé
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
                  Authentification multi-facteurs, règles d'accès par zone de
                  sécurité, antirecords et détection de talonnage. Un contrôle
                  granulaire pour chaque point d'entrée critique.
                </p>
              </GlassPanel>
            </AnimatedSection>

            <AnimatedSection delay={0.3}>
              <GlassPanel className="p-6">
                <h3 className="font-display text-lg text-white">
                  Résilience et disponibilité
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
                  Architecture auto-hébergée avec basculement automatique.
                  Journal d'audit immuable à chaîne de hachage. Fonctionnement
                  garanti même en cas de perte de connectivité réseau.
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
                  Site industriel sensible — classé OIV
                </h3>
                <p className="mt-3 leading-relaxed text-[#94a3b8]">
                  Comment un opérateur d'importance vitale a renforcé sa sécurité
                  périphérique et conforme sa surveillance aux exigences NIS 2.
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
