'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FaceRecognitionBadgeProps {
  status: 'recognized' | 'unknown' | 'pending' | 'error';
  name?: string;
  confidence?: number;
  className?: string;
}

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'secondary' | 'destructive'; icon: string; label: string }> = {
  recognized: { variant: 'success', icon: '✓', label: 'Reconnu' },
  unknown: { variant: 'warning', icon: '?', label: 'Inconnu' },
  pending: { variant: 'secondary', icon: '○', label: 'En attente' },
  error: { variant: 'destructive', icon: '✕', label: 'Erreur' },
};

export function FaceRecognitionBadge({
  status,
  name,
  confidence,
  className,
}: FaceRecognitionBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.error!;

  return (
    <Badge
      variant={config.variant}
      className={cn('gap-1 text-[10px] font-medium', className)}
    >
      <span className="text-[10px]">{config.icon}</span>
      {config.label}
      {name && status === 'recognized' && (
        <>
          <span className="mx-0.5 text-muted-foreground/50">—</span>
          <span className="font-semibold">{name}</span>
        </>
      )}
      {confidence !== undefined && status === 'recognized' && (
        <span className="text-muted-foreground ml-0.5">
          {Math.round(confidence)}%
        </span>
      )}
    </Badge>
  );
}
