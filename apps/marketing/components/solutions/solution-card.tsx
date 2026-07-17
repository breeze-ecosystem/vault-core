'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { GradientBorder } from '@/components/shared/gradient-border';
import { GlassPanel } from '@/components/shared/glass-panel';

interface SolutionCardProps {
  title: string;
  description: string;
  href: string;
  industry: string;
  image?: string;
  index?: number;
}

export function SolutionCard({
  title,
  description,
  href,
  industry,
  index = 0,
}: SolutionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        duration: 0.7,
        delay: index * 0.15,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Link href={href} className="group block h-full">
        <GradientBorder className="h-full">
          <GlassPanel className="flex h-full flex-col bg-[#070912] p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              {industry}
            </span>
            <h3 className="mt-2 font-display text-xl text-white">{title}</h3>
            <p className="mt-2 flex-1 text-sm text-[#94a3b8]">{description}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 transition-all duration-200 group-hover:gap-2.5">
              Explorer
              <span aria-hidden="true">&rarr;</span>
            </span>
          </GlassPanel>
        </GradientBorder>
      </Link>
    </motion.div>
  );
}
