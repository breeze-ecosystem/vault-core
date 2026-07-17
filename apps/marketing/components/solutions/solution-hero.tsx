'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'motion/react';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';

export function SolutionsHero() {
  const t = useTranslations('solutions');
  const ctaT = useTranslations('cta');
  const locale = useLocale();

  return (
    <Section variant="dark" className="relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-20">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
        aria-hidden="true"
      />

      <Container className="relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="font-display text-[42px] leading-tight text-[#f1f5f9] md:text-[56px]">
            {t('heading')}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#94a3b8]">
            {t('subheading')}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href={`/${locale}/contact`}>
              <Button variant="primary" size="lg" className="px-8">
                {ctaT('bookDemo')}
              </Button>
            </Link>
            <Link href={`/${locale}/demo`}>
              <Button variant="glass" size="lg" className="px-8">
                {ctaT('seeInAction')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}
