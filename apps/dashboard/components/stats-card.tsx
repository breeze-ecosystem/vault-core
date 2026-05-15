import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number; positive: boolean };
}

export function StatsCard({ title, value, description, icon: Icon, iconColor, trend }: StatsCardProps) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="font-mono tabular-nums text-2xl font-semibold tracking-tight">
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10",
            iconColor
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            <span className={trend.positive ? "text-success" : "text-destructive"}>
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
            <span className="text-muted-foreground">vs. hier</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
