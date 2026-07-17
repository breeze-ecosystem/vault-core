'use client';

import { type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
  delay?: number;
}

export function AnimatedSection({
  children,
  className,
  as: Tag = 'div',
  delay = 0,
}: AnimatedSectionProps) {
  const MotionTag = motion[Tag as keyof typeof motion] as typeof motion.div;

  return (
    <MotionTag
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}
