'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AlertTriangle, Users } from 'lucide-react';

interface CrowdDensityDisplayProps {
  count: number;
  maxCount: number;
  densityPercent: number;
  thresholdExceeded: boolean;
  className?: string;
}

export function CrowdDensityDisplay({
  count,
  maxCount,
  densityPercent,
  thresholdExceeded,
  className,
}: CrowdDensityDisplayProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Densité de foule</span>
        </div>
        {thresholdExceeded && (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <AlertTriangle className="h-3 w-3" />
            Seuil dépassé
          </Badge>
        )}
      </div>

      <div className="flex items-end gap-3">
        <span className="font-mono text-3xl font-semibold tabular-nums">
          {count}
        </span>
        <span className="text-sm text-muted-foreground mb-1">
          / {maxCount} personnes
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Densité</span>
          <span
            className={cn(
              'font-mono tabular-nums',
              thresholdExceeded ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {Math.round(densityPercent)}%
          </span>
        </div>
        <Progress
          value={Math.min(100, densityPercent)}
          className={cn(
            'h-2',
            thresholdExceeded && '[&>div]:bg-destructive',
          )}
        />
      </div>
    </div>
  );
}
