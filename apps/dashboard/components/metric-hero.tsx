"use client";

import { type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass-card";
import { Sparkline } from "@/components/sparkline";
import { itemVariants } from "@/components/page-transition";

interface MetricHeroProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  description?: string;
  sparklineData?: number[];
  className?: string;
}

export function MetricHero({
  title,
  value,
  icon: Icon,
  trend,
  description,
  sparklineData,
  className,
}: MetricHeroProps) {
  return (
    <motion.div variants={itemVariants}>
      <GlassCard variant="default" className={cn("p-5", className)}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          </div>
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5",
                trend.positive
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              <span>{trend.positive ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className="font-mono tabular-nums text-2xl font-semibold tracking-tight">
          {value}
        </div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
          {title}
        </div>
        {description && (
          <div className="text-xs text-muted-foreground/70 mt-1">
            {description}
          </div>
        )}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-3">
            <Sparkline data={sparklineData} height={32} />
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
