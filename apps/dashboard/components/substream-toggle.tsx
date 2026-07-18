'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SubstreamToggleProps {
  current: 'hd' | 'sd';
  onToggle: () => void;
}

export function SubstreamToggle({ current, onToggle }: SubstreamToggleProps) {
  const [showLabel, setShowLabel] = useState(false);

  const handleToggle = () => {
    onToggle();
    setShowLabel(true);
  };

  useEffect(() => {
    if (!showLabel) return;
    const t = setTimeout(() => setShowLabel(false), 1000);
    return () => clearTimeout(t);
  }, [showLabel]);

  return (
    <div className="relative">
      <Badge
        variant={current === 'hd' ? 'default' : 'secondary'}
        className={cn(
          'cursor-pointer select-none text-[10px] px-1.5 py-0 transition-all',
          current === 'hd' && 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border-cyan-500/30',
          current === 'sd' && 'bg-muted/50 text-muted-foreground hover:bg-muted/70',
        )}
        onClick={handleToggle}
      >
        {current === 'hd' ? 'HD' : 'SD'}
      </Badge>

      {showLabel && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white animate-fade-in">
          {current === 'hd' ? 'HD' : 'SD'}
        </span>
      )}
    </div>
  );
}
