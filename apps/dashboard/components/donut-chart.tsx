"use client";

import { useId } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass-card";

interface DonutChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  size?: number;
  className?: string;
}

export function DonutChart({
  data,
  size = 200,
  className,
}: DonutChartProps) {
  const id = useId();
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <GlassCard variant="default" className={cn("p-5", className)}>
      <div className="flex items-center justify-center" style={{ height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, index) => (
                <Cell key={`${id}-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono tabular-nums text-xl font-semibold tracking-tight">
            {total}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Total
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {data.map((entry, index) => (
          <div key={`${id}-legend-${index}`} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
