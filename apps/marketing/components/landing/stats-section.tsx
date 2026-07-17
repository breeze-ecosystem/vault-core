'use client';

import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { AnimatedSection } from '@/components/ui/animated-section';
import { StatsCounter } from '@/components/shared/stats-counter';

interface StatItem {
  value: number;
  suffix: string;
  labelKey: string;
  isStatic?: boolean;
}

const STATS_DATA: StatItem[] = [
  { value: 99.9, suffix: '%', labelKey: 'uptime' },
  { value: 247, suffix: '', labelKey: 'monitoring', isStatic: true },
  { value: 150, suffix: '+', labelKey: 'teams' },
  { value: 100, suffix: '%', labelKey: 'selfHosted' },
];

export function StatsSection() {
  const t = useTranslations('stats');

  return (
    <Section
      variant="dark"
      className="bg-gradient-to-b from-[#070912] via-[#0c1020] to-[#070912]"
    >
      <Container>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS_DATA.map((stat) => (
            <AnimatedSection key={stat.labelKey}>
              <div className="text-center">
                {stat.isStatic ? (
                  <p className="text-4xl font-bold text-white sm:text-[40px] tabular-nums">
                    24/7
                  </p>
                ) : (
                  <p className="text-4xl font-bold text-white sm:text-[40px]">
                    <StatsCounter
                      value={stat.value}
                      suffix={stat.suffix}
                      duration={2}
                      decimals={stat.value % 1 !== 0 ? 1 : 0}
                    />
                  </p>
                )}
                <p className="mt-2 text-sm text-[#94a3b8]">{t(stat.labelKey)}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </Container>
    </Section>
  );
}
