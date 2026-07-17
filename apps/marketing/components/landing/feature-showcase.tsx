'use client';

import {
  Shield,
  Brain,
  Server,
  Bell,
  Smartphone,
  CreditCard,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { AnimatedSection } from '@/components/ui/animated-section';
import { FeatureCard } from './feature-card';

export function FeatureShowcase() {
  const t = useTranslations('features');
  const cards = useTranslations('featureCards');

  const featureKeys = ['0', '1', '2', '3', '4', '5'] as const;
  const icons = [Shield, Brain, Server, Bell, Smartphone, CreditCard];

  return (
    <Section variant="alt">
      <Container>
        <AnimatedSection>
          <h2 className="font-display text-[32px] text-[#f1f5f9]">
            {t('heading')}
          </h2>
          <p className="mt-4 max-w-2xl text-[#94a3b8]">
            {t('subheading')}
          </p>
        </AnimatedSection>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
          {featureKeys.map((key, index) => {
            const card = cards.raw(key) as { title: string; description: string };
            const Icon = icons[index];
            return (
              <AnimatedSection key={key} delay={index * 0.1}>
                <FeatureCard
                  icon={Icon}
                  title={card.title}
                  description={card.description}
                  index={index}
                />
              </AnimatedSection>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
