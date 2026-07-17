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
      {/* Grid pattern — using bg-grid class from globals.css */}
      <div className="absolute inset-0 bg-grid" />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#070912]" />

      {/* Floating gradient orbs — cyber accents */}
      <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
    </div>
  );
}
