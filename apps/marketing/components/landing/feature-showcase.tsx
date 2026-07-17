'use client';

import {
  Shield,
  Brain,
  Server,
  Bell,
  Smartphone,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { AnimatedSection } from '@/components/ui/animated-section';
import { FeatureCard } from './feature-card';

const icons: LucideIcon[] = [
  Shield, Brain, Server, Bell, Smartphone, CreditCard,
];

export function FeatureShowcase() {
  const t = useTranslations('features');
  const cards = useTranslations('featureCards');

  const cardKeys = [0, 1, 2, 3, 4, 5];

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
          {cardKeys.map((index) => {
            const card = cards.raw(String(index)) as {
              title: string;
              description: string;
            };
            const Icon = icons[index] as LucideIcon;
            return (
              <AnimatedSection key={index} delay={index * 0.1}>
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
