import {
  Brain,
  Eye,
  ShieldCheck,
  BarChart3,
  Workflow,
  Lock,
} from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { AnimatedSection } from '@/components/ui/animated-section';

const AI_FEATURES = [
  {
    icon: Brain,
    title: 'On-Device AI Processing',
    description:
      'All analysis runs locally on your edge hardware — no cloud dependency, no video leaving your network.',
  },
  {
    icon: Eye,
    title: 'Real-Time Object Detection',
    description:
      'Identify people, vehicles, and objects in real time. Set zone-based rules for automated responses.',
  },
  {
    icon: ShieldCheck,
    title: 'Anomaly Detection',
    description:
      'AI models learn your facility&apos;s normal patterns and flag unusual behavior — tailgating, loitering, forced entry.',
  },
  {
    icon: BarChart3,
    title: 'Smart Search & Retrieval',
    description:
      'Search hours of footage in seconds using natural language queries. &quot;Show me all deliveries from yesterday afternoon.&quot;',
  },
  {
    icon: Workflow,
    title: 'Automated Workflows',
    description:
      'Trigger actions based on AI detections — open a gate, alert security, start recording, send a notification.',
  },
  {
    icon: Lock,
    title: 'Privacy-First Architecture',
    description:
      'All data stays on your infrastructure. AI models run locally. No external APIs, no third-party training data.',
  },
];

export function AIHighlightSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0c1020] to-[#070912] py-24 md:py-32">
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(6,182,212,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.15) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
        aria-hidden="true"
      />

      <Container>
        <AnimatedSection>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-[36px]">
              Built on AI. Powered by you.
            </h2>
            <p className="mt-4 text-lg text-white/60">
              On-premise AI that respects your data privacy — processing happens
              on your infrastructure, not in the cloud.
            </p>
          </div>
        </AnimatedSection>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {AI_FEATURES.map((feature, index) => (
            <AnimatedSection key={feature.title}>
              <div className="group rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-250 hover:border-primary/30 hover:bg-white/[0.06]">
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/50">
                  {feature.description}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </Container>
    </section>
  );
}
