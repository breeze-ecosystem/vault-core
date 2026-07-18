'use client';

import { cn } from '@/lib/utils';

interface FaceRiskScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  inline?: boolean;
}

const scoreColors = {
  high: 'text-success',
  medium: 'text-warning',
  low: 'text-muted-foreground',
} as const;

function getScoreColor(score: number): keyof typeof scoreColors {
  if (score >= 85) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

function getScoreLabel(score: number): string | null {
  if (score >= 85) return 'Match';
  if (score >= 60) return 'Incertain';
  return null;
}

function getScoreBg(score: number): string {
  if (score >= 85) return 'bg-success/20';
  if (score >= 60) return 'bg-warning/20';
  return 'bg-muted/30';
}

function getScoreFill(score: number): string {
  if (score >= 85) return 'bg-success';
  if (score >= 60) return 'bg-warning';
  return 'bg-muted-foreground/30';
}

export function FaceRiskScore({
  score,
  size = 'md',
  showLabel = true,
  inline = false,
}: FaceRiskScoreProps) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'font-mono text-2xl',
    lg: 'font-mono text-3xl',
  }[size];

  if (inline) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', getScoreFill(score))}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
        <span className={cn('font-mono text-xs tabular-nums', scoreColors[color])}>
          {Math.round(score)}%
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={cn(sizeClasses, 'tabular-nums font-semibold', scoreColors[color])}>
        {Math.round(score)}
        <span className="text-xs font-normal opacity-60">%</span>
      </span>
      {showLabel && label && (
        <span className={cn('text-[10px] font-medium uppercase tracking-wider', scoreColors[color])}>
          {label}
        </span>
      )}
      {/* Mini progress bar */}
      <div className="w-full h-1 rounded-full bg-muted/30 overflow-hidden mt-0.5">
        <div
          className={cn('h-full rounded-full transition-all', getScoreBg(score))}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}
