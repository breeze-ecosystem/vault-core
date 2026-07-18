'use client';

import { Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SensitivitySliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function SensitivitySlider({
  value,
  onChange,
  min = 1,
  max = 100,
  className,
}: SensitivitySliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Faible</span>
        </div>
        <span className="text-xs font-mono text-foreground">{value}%</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Élevée</span>
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
        </div>
      </div>

      <div className="relative h-2">
        {/* Track background */}
        <div className="absolute inset-0 rounded-full bg-secondary">
          {/* Filled track */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/40 via-primary to-warning transition-all duration-200"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Range input overlay */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
        />

        {/* Thumb indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm transition-all duration-200 pointer-events-none"
          style={{ left: `${percentage}%` }}
        />
      </div>

      {/* Tick marks */}
      <div className="flex justify-between px-0.5">
        {[min, Math.round((max - min) / 4 + min), Math.round((max - min) / 2 + min), Math.round((max - min) * 0.75 + min), max].map((tick) => (
          <div key={tick} className="flex flex-col items-center">
            <div className="h-1 w-px bg-border" />
            <span className="text-[10px] text-muted-foreground mt-0.5">{tick}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
