"use client";

import { type HTMLAttributes, forwardRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { itemVariants } from "@/components/page-transition";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "accent";
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={itemVariants}
        className={cn(
          "rounded-xl border transition-all duration-200",
          variant === "default" &&
            "bg-card/60 backdrop-blur-sm border-border/40 shadow-[0_8px_32px_hsl(var(--shadcn-primary)/0.04)]",
          variant === "accent" &&
            "bg-primary/[0.04] border-primary/[0.12] shadow-[0_8px_32px_hsl(var(--shadcn-primary)/0.06)]",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
GlassCard.displayName = "GlassCard";

export { GlassCard };
export type { GlassCardProps };
