'use client';

import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface ScrollIndicatorProps {
  className?: string;
}

export function ScrollIndicator({ className }: ScrollIndicatorProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 pb-8 text-[#64748b]',
        className,
      )}
    >
      <span className="text-xs tracking-wide uppercase">
        Faites défiler
      </span>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 13l5 5 5-5" />
          <path d="M7 6l5 5 5-5" />
        </svg>
      </motion.div>
    </div>
  );
}
