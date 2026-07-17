'use client';

import type { LucideIcon } from 'lucide-react';
import { GlassPanel } from '@/components/shared/glass-panel';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index?: number;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <GlassPanel hover className="p-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-lg font-semibold text-[#f1f5f9]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
        {description}
      </p>
    </GlassPanel>
  );
}
