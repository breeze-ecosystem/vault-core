'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import { GlassPanel } from '@/components/shared/glass-panel';

interface CaseStudyCardProps {
  title: string;
  excerpt: string;
  slug: string;
  industry: string;
  client: string;
  index?: number;
}

export function CaseStudyCard({
  title,
  excerpt,
  slug,
  industry,
  client: clientName,
  index = 0,
}: CaseStudyCardProps) {
  const locale = useLocale();
  const t = useTranslations('caseStudies');
  const href = `/${locale}/etudes-de-cas/${slug}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        duration: 0.7,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Link href={href} className="block h-full">
        <GlassPanel hover className="flex h-full flex-col p-6">
          {/* Industry tag */}
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
            {industry}
          </span>

          {/* Title */}
          <h3 className="mt-2 text-lg font-display text-white">
            {title}
          </h3>

          {/* Client */}
          <p className="mt-1 text-sm text-[#64748b]">
            {clientName}
          </p>

          {/* Excerpt */}
          <p className="mt-3 flex-1 text-sm text-[#94a3b8]">
            {excerpt}
          </p>

          {/* Read more link */}
          <span className="mt-4 text-sm font-medium text-cyan-400">
            {t('readMore')} &rarr;
          </span>
        </GlassPanel>
      </Link>
    </motion.div>
  );
}
