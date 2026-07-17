import { cn } from '@/src/lib/utils';

interface EyebrowTagProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'accent';
}

export function EyebrowTag({
  children,
  className,
  variant = 'default',
}: EyebrowTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider',
        variant === 'default' && 'bg-white/[0.05] text-muted',
        variant === 'accent' && 'bg-cyan-500/10 text-cyan-400',
        className,
      )}
    >
      {children}
    </span>
  );
}
