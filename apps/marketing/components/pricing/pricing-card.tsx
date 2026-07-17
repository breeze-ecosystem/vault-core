'use client';

import { Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/ui/animated-section';
import { GlassPanel } from '@/components/shared/glass-panel';
import { GradientBorder } from '@/components/shared/gradient-border';
import type { TierData } from './pricing-tier-data';

type PricingCardProps = {
  tier: TierData;
  index: number;
};

export function PricingCard({ tier, index }: PricingCardProps) {
  const card = (
    <GlassPanel hover className="flex flex-col p-8 h-full">
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            {tier.badge}
          </span>
        </div>
      )}

      <div className="mb-6 space-y-1.5">
        <h3 className="text-lg font-display text-white">{tier.name}</h3>
        <p className="text-sm text-[#94a3b8]">{tier.description}</p>
      </div>

      <div className="mb-2">
        <p className="text-sm text-[#94a3b8]">Contact us for pricing</p>
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
            <span className="text-sm text-[#94a3b8]">{feature}</span>
          </li>
        ))}
      </ul>

      <Button variant={tier.ctaVariant} size="lg" className="w-full">
        {tier.ctaLabel}
      </Button>
    </GlassPanel>
  );

  if (tier.highlighted) {
    return (
      <AnimatedSection className="relative">
        <GradientBorder>{card}</GradientBorder>
      </AnimatedSection>
    );
  }

  return (
    <AnimatedSection>
      {card}
    </AnimatedSection>
  );
}
