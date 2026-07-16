'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { AnimatedSection } from '@/components/ui/animated-section';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'How does your pricing model work?',
    answer:
      'We offer simple, predictable license-based pricing with three tiers: Starter, Professional, and Enterprise. Each tier includes a specific set of features and device limits. There are no per-camera fees, no hidden costs, and no long-term contracts required.',
  },
  {
    question: 'Is there a free trial available?',
    answer:
      'Yes, all plans include a 14-day free trial with no credit card required. You get full access to all features in your chosen tier, allowing you to evaluate the platform with your real security infrastructure before making a commitment.',
  },
  {
    question: 'Can I deploy Oversight Hub on-premise?',
    answer:
      'Yes, all tiers support on-premise deployment. Oversight Hub is self-hosted via Docker Compose on your infrastructure — no mandatory cloud dependency. This ensures your video data and access logs remain under your control, which is essential for organizations with strict data residency requirements.',
  },
  {
    question: 'What kind of support do you offer?',
    answer:
      'Starter plans include standard support via email. Professional plans add priority support with faster response times. Enterprise plans include a dedicated support engineer, priority SLAs, and personalized onboarding assistance to ensure a smooth deployment.',
  },
  {
    question: 'Can I customize the platform for my specific needs?',
    answer:
      'Professional and Enterprise tiers support custom integrations via our REST API and webhook system. Enterprise customers additionally get access to custom feature development, white-labeling options, and dedicated engineering time for bespoke requirements.',
  },
  {
    question: 'Is Oversight Hub compliant with security standards?',
    answer:
      'Yes, Oversight Hub is built with security as a foundation. Features include immutable audit logs with hash-chain integrity, role-based access control (RBAC) with fine-grained permissions, encrypted data at rest and in transit, and optional on-premise deployment. We follow industry best practices for access control, authentication, and data protection.',
  },
  {
    question: 'How does migration work if I\'m already using another system?',
    answer:
      'We provide a structured migration process for new customers. Our team will work with you to assess your current setup, plan the migration timeline, and ensure minimal disruption to your security operations. Professional and Enterprise plans include dedicated migration support and documentation.',
  },
];

export function FAQSection() {
  return (
    <Section variant="alt">
      <Container>
        <AnimatedSection>
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-12 text-center text-3xl font-semibold text-foreground sm:text-[36px]">
              Frequently asked questions
            </h2>

            <div className="space-y-3">
              {faqItems.map((item, index) => (
                <details
                  key={index}
                  className="group rounded-xl border border-border bg-white transition-shadow duration-200 hover:shadow-sm [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-left list-none">
                    <span className="pr-4 text-sm font-medium text-foreground">
                      {item.question}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <div className="border-t border-border px-6 pb-5 pt-4">
                    <p className="text-sm leading-relaxed text-muted">
                      {item.answer}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </Container>
    </Section>
  );
}
