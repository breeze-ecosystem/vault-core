'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Shield, ShieldAlert, HelpCircle } from 'lucide-react';

interface LivenessIndicatorProps {
  score: number;
  showScore?: boolean;
  className?: string;
}

type LivenessStatus = 'genuine' | 'uncertain' | 'spoof';

function getLivenessStatus(score: number): LivenessStatus {
  if (score > 0.6) return 'genuine';
  if (score >= 0.3) return 'uncertain';
  return 'spoof';
}

const livenessConfig: Record<
  LivenessStatus,
  { variant: 'success' | 'warning' | 'destructive'; label: string; icon: React.ReactNode; tooltip: string }
> = {
  genuine: {
    variant: 'success',
    label: 'Vivant',
    icon: <Shield className="h-3 w-3" />,
    tooltip: 'Score de vivacité élevé — aucune tentative de fraude détectée',
  },
  uncertain: {
    variant: 'warning',
    label: 'Incertain',
    icon: <HelpCircle className="h-3 w-3" />,
    tooltip: 'Score de vivacité faible — vérifiez la qualité de l\'image ou les conditions d\'éclairage',
  },
  spoof: {
    variant: 'destructive',
    label: 'Spoof',
    icon: <ShieldAlert className="h-3 w-3" />,
    tooltip: 'Tentative de fraude détectée — photo, écran ou masque suspect',
  },
};

export function LivenessIndicator({
  score,
  showScore = false,
  className,
}: LivenessIndicatorProps) {
  const status = getLivenessStatus(score);
  const config = livenessConfig[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            className={cn(
              'gap-1 text-[10px] font-medium',
              status === 'spoof' && 'shadow-[0_0_8px_hsl(var(--shadcn-destructive)/0.4)]',
              className,
            )}
          >
            {config.icon}
            {config.label}
            {showScore && (
              <span className="font-mono text-[10px] tabular-nums ml-0.5">
                {score.toFixed(2)}
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
