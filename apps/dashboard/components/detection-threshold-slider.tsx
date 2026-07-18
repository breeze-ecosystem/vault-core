'use client';

import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface DetectionThresholdSliderProps {
  detectionType: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function DetectionThresholdSlider({
  detectionType,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className,
}: DetectionThresholdSliderProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{detectionType}</Label>
        <span className="font-mono text-sm tabular-nums text-primary">
          {value}%
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v = 50]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Faible sensibilité</span>
        <span>Haute sensibilité</span>
      </div>
    </div>
  );
}
