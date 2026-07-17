import { cn } from '@/src/lib/utils';

interface GradientBorderProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section';
}

export function GradientBorder({
  children,
  className,
  as: Tag = 'div',
}: GradientBorderProps) {
  return (
    <Tag
      className={cn(
        'relative rounded-2xl bg-gradient-to-b from-cyan-500/20 to-transparent p-px',
        className,
      )}
    >
      <div className="h-full w-full rounded-2xl bg-[#070912]">{children}</div>
    </Tag>
  );
}
