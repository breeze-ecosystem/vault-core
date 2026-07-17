'use client';

import { GlassPanel } from '@/components/shared/glass-panel';

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar?: string;
}

export function TestimonialCard({
  quote,
  author,
  role,
  company,
}: TestimonialCardProps) {
  return (
    <GlassPanel hover className="p-6 flex flex-col justify-between h-full">
      <div>
        <span className="font-display text-3xl text-cyan-400/30 leading-none">
          &ldquo;
        </span>
        <p className="mt-1 text-sm leading-relaxed text-[#94a3b8] italic">
          {quote}
        </p>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/10 text-xs font-semibold text-cyan-400">
          {author
            .split(' ')
            .map((n) => n[0])
            .join('')}
        </div>
        <div>
          <p className="text-sm font-semibold text-[#f1f5f9]">{author}</p>
          <p className="text-xs text-[#94a3b8]">
            {role}, {company}
          </p>
        </div>
      </div>
    </GlassPanel>
  );
}
