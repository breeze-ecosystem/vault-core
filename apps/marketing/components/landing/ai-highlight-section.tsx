'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { AnimatedSection } from '@/components/ui/animated-section';
import { GradientBorder } from '@/components/shared/gradient-border';


const FEATURES_LIST = [
  'Analyse IA en temps réel sur site — aucune donnée ne quitte votre infrastructure',
  'Détection d\'anomalies et alertes prédictives basées sur l\'apprentissage des comportements',
  'Corrélation automatique des événements d\'accès avec les flux vidéo',
  'Workflows automatisés déclenchés par l\'IA pour une réponse immédiate',
];

export function AIHighlightSection() {
  const t = useTranslations('ai');

  return (
    <Section variant="alt">
      <Container>
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Left column — content (60%) */}
          <div className="lg:col-span-3">
            <AnimatedSection>
              <h2 className="font-display text-[32px] text-[#f1f5f9]">
                {t('heading')}
              </h2>
            </AnimatedSection>
            <AnimatedSection delay={0.1}>
              <p className="mt-4 text-[#94a3b8] leading-relaxed">
                {t('subheading')}
              </p>
            </AnimatedSection>
            <AnimatedSection delay={0.2}>
              <ul className="mt-8 space-y-4">
                {FEATURES_LIST.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm text-[#94a3b8]">{item}</span>
                  </li>
                ))}
              </ul>
            </AnimatedSection>
          </div>

          {/* Right column — platform mockup (40%) */}
          <div className="lg:col-span-2">
            <AnimatedSection delay={0.3}>
              <GradientBorder className="h-full">
                <div className="flex min-h-[320px] items-center justify-center p-8">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10">
                      <svg
                        className="h-8 w-8 text-cyan-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <path d="M8 21h8" />
                        <path d="M12 17v4" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-[#f1f5f9]">
                      Plateforme en action
                    </p>
                    <p className="mt-1 text-xs text-[#64748b]">
                      Tableau de bord en temps réel
                    </p>
                  </div>
                </div>
              </GradientBorder>
            </AnimatedSection>
          </div>
        </div>
      </Container>
    </Section>
  );
}
