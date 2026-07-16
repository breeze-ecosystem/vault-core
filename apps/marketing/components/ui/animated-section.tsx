'use client';

import { useRef, type ReactNode } from 'react';
import { useInView } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
}

export function AnimatedSection({
  children,
  className,
  as: Tag = 'div',
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <Tag
      ref={ref}
      className={cn(
        'transition-all duration-[600ms]',
        isInView
          ? 'translate-y-0 opacity-100'
          : 'translate-y-6 opacity-0',
        className,
      )}
      style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {children}
    </Tag>
  );
}
