"use client";

import { type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "outline";
}

interface QuickActionBarProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActionBar({ actions, className }: QuickActionBarProps) {
  return (
    <GlassCard variant="default" className={cn("p-1", className)}>
      <motion.div
        className="flex items-center gap-2"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.05, delayChildren: 0.05 },
          },
        }}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.id}
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
              }}
            >
              <Button
                variant={action.variant || "outline"}
                size="sm"
                className="gap-2"
                onClick={action.onClick}
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </Button>
            </motion.div>
          );
        })}
      </motion.div>
    </GlassCard>
  );
}
