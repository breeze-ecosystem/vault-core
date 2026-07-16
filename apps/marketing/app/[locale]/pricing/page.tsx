import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/src/i18n/routing';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { AnimatedSection } from '@/components/ui/animated-section';
import { CTASection } from '@/components/landing/cta-section';
import { PricingCard } from '@/components/pricing/pricing-card';
import { tiers } from '@/components/pricing/pricing-tier-data';
import { FeatureComparisonTable } from '@/components/pricing/feature-comparison-table';
import { FAQSection } from '@/components/pricing/faq-section';
import {
  SoftwareApplicationJsonLd,
  BreadcrumbListJsonLd,
  FAQPageJsonLd,
} from '@/src/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: 'Pricing - OVERSIGHT AI',
    description:
      'Simple, transparent pricing for AI-powered physical security. Start with a free trial. Scale with confidence. No hidden fees.',
    alternates: {
      canonical: `https://oversighthub.com/${locale}/pricing`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `https://oversighthub.com/${l}/pricing`]),
      ),
    },
    openGraph: {
      title: 'Pricing - OVERSIGHT AI',
      description:
        'Simple, transparent pricing for AI-powered physical security. Start with a free trial. Scale with confidence. No hidden fees.',
      url: `https://oversighthub.com/${locale}/pricing`,
      siteName: 'Oversight AI',
      locale: locale === 'en' ? 'en_US' : locale === 'fr' ? 'fr_FR' : locale,
      type: 'website',
    },
  };
}

const pricingFaqQuestions = [
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
      'Yes, Oversight Hub is built with security as a foundation. Features include immutable audit logs with hash-chain integrity, role-based access control (RBAC) with fine-grained permissions, encrypted data at rest and in transit, and optional on-premise deployment.',
  },
  {
    question: "How does migration work if I'm already using another system?",
    answer:
      'We provide a structured migration process for new customers. Our team will work with you to assess your current setup, plan the migration timeline, and ensure minimal disruption to your security operations.',
  },
];

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <FAQPageJsonLd questions={pricingFaqQuestions} />
      <SoftwareApplicationJsonLd />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: `https://oversighthub.com/${locale}` },
          { name: 'Pricing', url: `https://oversighthub.com/${locale}/pricing` },
        ]}
      />
      <Header />
      <main>
        {/* Page heading */}
        <Section variant="default">
          <Container>
            <PageHeader
              heading="Simple, transparent pricing"
              subheading="Start with a free trial. Scale with confidence. No hidden fees."
            />

            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
              {tiers.map((tier, index) => (
                <PricingCard key={tier.id} tier={tier} index={index} />
              ))}
            </div>

            <p className="mt-10 text-center text-sm text-muted">
              All plans include a 14-day free trial. No credit card required.
            </p>
          </Container>
        </Section>

        {/* Feature comparison */}
        <Section variant="alt" className="!py-16 md:!py-24">
          <Container>
            <AnimatedSection>
              <h2 className="mb-10 text-center text-2xl font-semibold text-foreground sm:text-[30px]">
                Compare plans in detail
              </h2>
              <FeatureComparisonTable />
            </AnimatedSection>
          </Container>
        </Section>

        {/* FAQ */}
        <FAQSection />

        {/* Final CTA */}
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
