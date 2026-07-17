import { cn } from '@/src/lib/utils';

interface NoiseOverlayProps {
  className?: string;
}

export function NoiseOverlay({ className }: NoiseOverlayProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-40 pointer-events-none noise-overlay',
        className,
      )}
      aria-hidden="true"
    />
  );
}
