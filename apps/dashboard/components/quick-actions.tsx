"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <motion.div
      className={cn("flex flex-wrap gap-2", className)}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.04, delayChildren: 0.05 },
        },
      }}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.id}
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.3 },
              },
            }}
            onClick={action.onClick}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
              "bg-secondary/50 hover:bg-secondary/80 border border-border/40",
              "transition-colors duration-150"
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {action.label}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
