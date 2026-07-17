'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { GlassPanel } from '@/components/shared/glass-panel';

interface ProductCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  index?: number;
}

export function ProductCard({
  title,
  description,
  href,
  icon,
  index = 0,
}: ProductCardProps) {
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
      className="h-full"
    >
      <Link href={href} className="block h-full">
        <GlassPanel hover className="flex h-full flex-col p-6">
          {/* Icon */}
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            {icon}
          </div>

          {/* Title */}
          <h3 className="font-display text-lg text-[#f1f5f9]">{title}</h3>

          {/* Description */}
          <p className="mt-2 flex-1 text-sm text-[#94a3b8]">{description}</p>

          {/* CTA arrow */}
          <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-cyan-400">
            En savoir plus
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              &rarr;
            </span>
          </div>
        </GlassPanel>
      </Link>
    </motion.div>
  );
}
