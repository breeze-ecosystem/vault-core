import type { ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

type SectionVariant = 'default' | 'alt' | 'dark';

type SectionProps = {
  id?: string;
  variant?: SectionVariant;
  children: ReactNode;
  className?: string;
};

const variantStyles: Record<SectionVariant, string> = {
  default: 'bg-white',
  alt: 'bg-secondary',
  dark: 'bg-dark text-white',
};

export function Section({ id, variant = 'default', children, className }: SectionProps) {
  return (
    <section
      id={id}
      className={cn('py-24 md:py-32', variantStyles[variant], className)}
    >
      {children}
    </section>
  );
}
