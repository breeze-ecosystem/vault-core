'use client';

import { Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/ui/animated-section';
import type { TierData } from './pricing-tier-data';

type PricingCardProps = {
  tier: TierData;
  index: number;
};

export function PricingCard({ tier, index }: PricingCardProps) {
  return (
    <AnimatedSection
      className={cn(
        'relative flex flex-col rounded-xl border bg-white p-8 shadow-md transition-all duration-300 ease-out',
        tier.highlighted &&
          'ring-2 ring-cyan-500/40 shadow-[0_0_20px_-5px_hsl(190_90%_50%_/_0.3)] -translate-y-1',
        'hover:shadow-lg hover:-translate-y-2',
      )}
    >
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            {tier.badge}
          </span>
        </div>
      )}

      <div className="mb-6 space-y-1.5">
        <h3 className="text-xl font-semibold text-foreground">{tier.name}</h3>
        <p className="text-sm leading-relaxed text-muted">{tier.description}</p>
      </div>

      <div className="mb-2">
        <p className="text-sm text-muted">Contact us for pricing</p>
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span className="text-sm leading-relaxed text-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <Button variant={tier.ctaVariant} size="lg" className="w-full">
        {tier.ctaLabel}
      </Button>
    </AnimatedSection>
  );
}
