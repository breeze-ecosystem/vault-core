import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { AnimatedSection } from '@/components/ui/animated-section';

const STATS = [
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Real-time Monitoring' },
  { value: '150+', label: 'Security Teams' },
  { value: '100%', label: 'Self-Hosted' },
];

export function StatsSection() {
  return (
    <Section variant="dark">
      <Container>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat) => (
            <AnimatedSection key={stat.label}>
              <div className="text-center">
                <p className="text-4xl font-bold text-white sm:text-[40px]">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-white/60">{stat.label}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </Container>
    </Section>
  );
}
