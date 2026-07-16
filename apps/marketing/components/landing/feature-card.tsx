import type { LucideIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        'group rounded-xl border border-border bg-white p-6 shadow-sm transition-all duration-250 hover:shadow-lg hover:-translate-y-1',
        className,
      )}
    >
      <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
