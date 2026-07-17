'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { AnimatedSection } from '@/components/ui/animated-section';
import { Button } from '@/components/ui/button';
import { GradientBorder } from '@/components/shared/gradient-border';

export function CTASection() {
  const t = useTranslations('finalCta');
  const cta = useTranslations('cta');
  const locale = useLocale();

  return (
    <Section variant="default">
      <Container>
        <GradientBorder className="max-w-4xl mx-auto">
          <div className="px-8 py-16 text-center">
            <AnimatedSection>
              <h2 className="font-display text-[32px] text-[#f1f5f9]">
                {t('heading')}
              </h2>
            </AnimatedSection>
            <AnimatedSection delay={0.1}>
              <p className="mx-auto mt-4 max-w-xl text-[#94a3b8] leading-relaxed">
                {t('body')}
              </p>
            </AnimatedSection>
            <AnimatedSection delay={0.2}>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href={`/${locale}/contact`}>
                  <Button variant="primary" size="lg" className="px-8">
                    {t('action')}
                  </Button>
                </Link>
                <Link href={`/${locale}/pricing`}>
                  <Button variant="glass" size="lg" className="px-8">
                    {cta('explorePricing')}
                  </Button>
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </GradientBorder>
      </Container>
    </Section>
  );
}
