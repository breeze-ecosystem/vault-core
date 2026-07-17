import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/src/i18n/routing';
import { Header } from '@/components/layout/header';
import { PageHeader } from '@/components/ui/page-header';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { CTASection } from '@/components/landing/cta-section';
import { Footer } from '@/components/layout/footer';
import { ContactForm } from '@/components/contact/contact-form';

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Contact - OVERSIGHT AI',
  description:
    'Ready to see Oversight Hub in action? Fill out the form and our team will get back to you within 24 hours.',
  openGraph: {
    title: 'Contact - OVERSIGHT AI',
    description:
      'Ready to see Oversight Hub in action? Fill out the form and our team will get back to you within 24 hours.',
  },
};

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Header />
      <main>
        <Section variant="dark">
          <Container>
            <PageHeader
              heading="Get in touch"
              subheading="Ready to see Oversight Hub in action? Fill out the form and our team will get back to you within 24 hours."
            />
            <div className="mx-auto mt-12 max-w-lg">
              <ContactForm />
            </div>
          </Container>
        </Section>
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
