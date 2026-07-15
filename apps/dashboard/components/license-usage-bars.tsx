import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface LicenseUsageBarsProps {
  current: number;
  max: number | null;
  label: string;
}

export function LicenseUsageBars({ current, max, label }: LicenseUsageBarsProps) {
  if (max === null) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono tabular-nums">N/A</span>
        </div>
        <Progress value={0} className="h-2 opacity-30" />
      </div>
    );
  }

  const percentage = max > 0 ? Math.round((current / max) * 100) : 0;
  const colorClass = percentage >= 95 ? "bg-destructive" : percentage >= 80 ? "bg-warning" : "bg-primary";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{current} / {max}</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorClass)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
