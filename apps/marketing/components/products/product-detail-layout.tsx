import type { ReactNode } from 'react';
import { cn } from '@/src/lib/utils';
import { AnimatedSection } from '@/components/ui/animated-section';

interface ProductDetailLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function ProductDetailLayout({
  children,
  title,
  description,
  className,
}: ProductDetailLayoutProps) {
  return (
    <>
      {/* Hero banner */}
      <section
        className={cn(
          'bg-gradient-to-b from-[#070912] via-[#0c1020] to-[#070912] pb-16 pt-32',
          className,
        )}
      >
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection>
            <h1 className="font-display text-[56px] font-semibold leading-[1.1] text-[#f1f5f9]">
              {title}
            </h1>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="mt-4 max-w-2xl text-lg text-[#94a3b8]">{description}</p>
          </AnimatedSection>
        </div>
      </section>

      {/* Content children */}
      {children}
    </>
  );
}
