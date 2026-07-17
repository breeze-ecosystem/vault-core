'use client';

import { cn } from '@/src/lib/utils';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  as?: 'div' | 'section' | 'article';
}

export function GlassPanel({
  children,
  className,
  hover = false,
  as: Tag = 'div',
}: GlassPanelProps) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl',
        hover &&
          'transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.10] hover:scale-[1.02]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
