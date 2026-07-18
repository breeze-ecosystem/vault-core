'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AbandonedObjectTimerProps {
  zoneName: string;
  minutes: number;
  onChange: (minutes: number) => void;
  className?: string;
}

export function AbandonedObjectTimer({
  zoneName,
  minutes,
  onChange,
  className,
}: AbandonedObjectTimerProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm font-medium">{zoneName}</Label>
      <p className="text-xs text-muted-foreground">
        Temps avant alerte pour objet abandonné
      </p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          max={60}
          value={minutes}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 1 && val <= 60) {
              onChange(val);
            }
          }}
          className="w-24"
        />
        <span className="text-sm text-muted-foreground">minutes</span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>Min: 1 min</span>
        <span>Max: 60 min</span>
        <span>Recommandé: 5 min</span>
      </div>
    </div>
  );
}
