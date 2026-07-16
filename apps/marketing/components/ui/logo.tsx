import { cn } from '@/src/lib/utils';

interface LogoProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export function Logo({ variant = 'dark', className }: LogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-foreground';
  const accentColor = '#06b6d4';

  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold', textColor, className)}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="28" height="28" rx="6" fill={accentColor} />
        <path
          d="M8 20V8h3l3 8 3-8h3v12h-3v-6l-2.5 6h-1L11 14v6H8z"
          fill="white"
        />
      </svg>
      <span className="text-sm tracking-tight">
        OVERSIGHT
        <span style={{ color: accentColor }}>.</span>
      </span>
    </span>
  );
}
