import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { AnimatedSection } from '@/components/ui/animated-section';
import { Button } from '@/components/ui/button';

export function CTASection() {
  return (
    <section className="bg-gradient-to-br from-[#0c1020] via-[#0a1628] to-[#070912] py-24 md:py-32">
      <Container>
        <AnimatedSection>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-[36px]">
              Ready to transform your security operations?
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
              See how Oversight Hub unifies your video, access control, and AI
              analysis into one seamless experience.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/contact">
                <Button variant="primary" size="lg" className="px-8">
                  Book Your Demo
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  variant="secondary"
                  size="lg"
                  className="border-white/20 text-white/80 hover:border-primary hover:text-primary"
                >
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </AnimatedSection>
      </Container>
    </section>
  );
}
