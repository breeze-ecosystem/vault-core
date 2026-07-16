import {
  Shield,
  Brain,
  Server,
  Bell,
  Smartphone,
  CreditCard,
} from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { AnimatedSection } from '@/components/ui/animated-section';
import { FeatureCard } from './feature-card';
import { PageHeader } from '@/components/ui/page-header';

const FEATURES = [
  {
    icon: Shield,
    title: 'Unified Command Center',
    description:
      'Access control, video surveillance, and AI analysis — all in one real-time dashboard.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description:
      'Correlate events across systems with AI-generated summaries and anomaly detection.',
  },
  {
    icon: Server,
    title: 'Self-Hosted & Private',
    description:
      'Run entirely on your infrastructure. Your video never leaves your network.',
  },
  {
    icon: Bell,
    title: 'Real-Time Alerts',
    description:
      'Get notified the instant a door is forced, a tailgate is detected, or an anomaly appears.',
  },
  {
    icon: Smartphone,
    title: 'Guard-First Mobile',
    description:
      'Field tools designed for guards on patrol — check-in, incident capture, and door control from any device.',
  },
  {
    icon: CreditCard,
    title: 'License-Based Pricing',
    description:
      'Simple, predictable licensing. No per-camera fees, no hidden costs.',
  },
];

export function FeatureShowcase() {
  return (
    <Section variant="alt">
      <Container>
        <AnimatedSection>
          <PageHeader
            heading="Everything you need to secure your facility"
            subheading="A unified platform replacing fragmented security systems with one intelligent pane of glass."
          />
        </AnimatedSection>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <AnimatedSection key={feature.title}>
              <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            </AnimatedSection>
          ))}
        </div>
      </Container>
    </Section>
  );
}
