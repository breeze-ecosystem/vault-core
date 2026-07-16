import { cn } from '@/src/lib/utils';

type PageHeaderProps = {
  heading: string;
  subheading?: string;
  className?: string;
};

export function PageHeader({ heading, subheading, className }: PageHeaderProps) {
  return (
    <div className={cn('mx-auto max-w-3xl text-center', className)}>
      <h1 className="text-display mb-4 text-foreground md:text-[40px] sm:text-[32px] max-sm:text-[24px]">
        {heading}
      </h1>
      {subheading && (
        <p className="text-muted mx-auto max-w-2xl text-lg leading-relaxed">
          {subheading}
        </p>
      )}
    </div>
  );
}
