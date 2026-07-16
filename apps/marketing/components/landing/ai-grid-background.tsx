import { cn } from '@/src/lib/utils';

interface AIGridBackgroundProps {
  className?: string;
}

export function AIGridBackground({ className }: AIGridBackgroundProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
      aria-hidden="true"
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          animation: 'gridPan 20s linear infinite',
        }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#070912]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#070912]/40 via-transparent to-[#070912]/40" />

      {/* Accent glow */}
      <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
    </div>
  );
}
