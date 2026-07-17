'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { AIGridBackground } from './ai-grid-background';
import { ScrollIndicator } from './scroll-indicator';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  const t = useTranslations('hero');
  const cta = useTranslations('cta');
  const locale = useLocale();

  return (
    <section className="relative flex min-h-[85vh] items-center overflow-hidden bg-[#070912] pt-24">
      <AIGridBackground />

      <Container className="relative z-10">
        <div className="max-w-4xl">
          {/* EyebrowTag — accent pill */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-sm font-semibold text-cyan-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Plateforme de sécurité IA
          </motion.div>

          {/* H1 heading */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-[56px] font-semibold leading-[1.1] text-[#f1f5f9] max-w-3xl"
          >
            {t('headline')}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-2xl text-lg text-[#94a3b8]"
          >
            {t('subtitle')}
          </motion.p>

          {/* CTA buttons row */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col items-start gap-4 sm:flex-row"
          >
            <Link href={`/${locale}/demo`}>
              <Button variant="primary" size="xl" className="px-10">
                {cta('seeInAction')}
              </Button>
            </Link>
            <Link href={`/${locale}/contact`}>
              <Button variant="glass" size="xl" className="px-10">
                {cta('talkToSales')}
              </Button>
            </Link>
          </motion.div>

          {/* TrustBar text */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 text-sm text-[#64748b]"
          >
            {t('trustBar')}
          </motion.p>
        </div>
      </Container>

      <ScrollIndicator />
    </section>
  );
}
