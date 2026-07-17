'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { DemoStep } from '@/components/demo/demo-step';
import { GlassPanel } from '@/components/shared/glass-panel';
import { Button } from '@/components/ui/button';

interface DemoStepData {
  id: string;
  title: string;
  description: string;
  tooltipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const DEMO_STEPS: DemoStepData[] = [
  {
    id: 'access-event',
    title: "Événement d'accès entrant",
    description:
      "Un badge est scanné à l'entrée principale. Le système identifie instantanément le détenteur du badge, vérifie ses autorisations et enregistre l'événement en temps réel.",
    tooltipPosition: 'top-right',
  },
  {
    id: 'video-evidence',
    title: 'Corrélation vidéo',
    description:
      "La caméra associée à la porte s'active et la séquence vidéo est corrélée à l'événement d'accès. L'opérateur voit le badge scanné et la personne en temps réel.",
    tooltipPosition: 'bottom-left',
  },
  {
    id: 'ai-analysis',
    title: 'Analyse IA en direct',
    description:
      "L'IA analyse le flux vidéo et détecte une anomalie : un talonnage est en cours. L'alerte est générée automatiquement avec un niveau de confiance de 94%.",
    tooltipPosition: 'top-left',
  },
  {
    id: 'alert-dispatch',
    title: 'Alerte et notification',
    description:
      "L'alerte est envoyée aux agents de sécurité via l'application mobile et le tableau de bord. Elle inclut la vidéo, les détails de l'événement et les actions recommandées.",
    tooltipPosition: 'bottom-right',
  },
  {
    id: 'resolution',
    title: 'Résolution et rapport',
    description:
      "L'agent confirme l'incident, prend les mesures nécessaires et génère un rapport. Tout est horodaté et immuable pour la conformité et les audits.",
    tooltipPosition: 'top-right',
  },
];

export function DemoTour() {
  const t = useTranslations('demo');
  const [currentStep, setCurrentStep] = useState(0);
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.03] via-transparent to-transparent pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 py-32 text-center">
          {/* Decorative glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-[56px] font-display text-white text-center font-semibold leading-[1.1]">
              {t('heading')}
            </h1>
            <p className="text-lg text-[#94a3b8] text-center max-w-xl mx-auto mt-4">
              {t('subheading')}
            </p>
            <div className="mt-8 flex justify-center">
              <Button
                variant="primary"
                size="xl"
                onClick={() => setStarted(true)}
              >
                <Play className="mr-2 h-5 w-5" />
                {t('startTour')}
              </Button>
            </div>
          </motion.div>

          {/* Decorative preview mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 max-w-4xl mx-auto"
          >
            <GlassPanel className="p-1">
              <div className="aspect-video w-full rounded-xl bg-[#0c1020] flex items-center justify-center border border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="h-8 w-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                      <Play className="h-4 w-4 text-cyan-400" />
                    </div>
                  </div>
                  <span className="text-sm text-[#64748b]">
                    {t('heading')}
                  </span>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        </div>
      </section>
    );
  }

  const step = DEMO_STEPS[currentStep]!;
  const isLastStep = currentStep === DEMO_STEPS.length - 1;

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        <DemoStep step={step} isActive />

        {/* Navigation controls */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center justify-between w-full">
            {/* Previous button */}
            <Button
              variant="ghost"
              size="md"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((p) => Math.max(0, p - 1))}
            >
              {t('previous')}
            </Button>

            {/* Step indicators */}
            <div className="flex items-center gap-2">
              {DEMO_STEPS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'w-8 bg-cyan-500'
                      : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                  aria-label={`${t('step').replace('{current}', String(i + 1)).replace('{total}', String(DEMO_STEPS.length))}`}
                />
              ))}
            </div>

            {/* Next / Restart button */}
            {isLastStep ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setCurrentStep(0);
                  setStarted(false);
                }}
              >
                {t('startOver')}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() =>
                  setCurrentStep((p) => Math.min(DEMO_STEPS.length - 1, p + 1))
                }
              >
                {t('next')}
              </Button>
            )}
          </div>

          {/* Step counter label */}
          <p className="text-sm text-[#64748b] text-center">
            {t('step', { current: currentStep + 1, total: DEMO_STEPS.length })}
          </p>
        </div>
      </div>
    </section>
  );
}
