'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';

export function ProductsHero() {
  const t = useTranslations('produits');
  const locale = useLocale();

  return (
    <section className="relative overflow-hidden bg-[#070912] pt-32">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />

      <Container className="relative z-10">
        <div className="max-w-3xl">
          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-[56px] font-semibold leading-[1.1] text-[#f1f5f9]"
          >
            {t('heading')}
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.15,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="mt-6 max-w-2xl text-lg text-[#94a3b8]"
          >
            {t('subheading')}
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="mt-10"
          >
            <Link href={`/${locale}/produits/video`}>
              <Button variant="primary" size="xl" className="px-10">
                {t('cta')}
              </Button>
            </Link>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
