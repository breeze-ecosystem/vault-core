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
  default: 'bg-[#070912]',
  alt: 'bg-[#0c1020]',
  dark: 'bg-[#070912]',
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
