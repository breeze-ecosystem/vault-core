"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { itemVariants } from "@/components/page-transition";

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
    <motion.div variants={itemVariants}>
      <GlassCard variant="default" className="group p-5 transition-all duration-300 hover:border-primary/30">
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
      </GlassCard>
    </motion.div>
  );
}
