"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { itemVariants } from "@/components/page-transition";

interface GlassCardProps {
  variant?: "default" | "accent";
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function GlassCard({
  className,
  variant = "default",
  children,
  onClick,
}: GlassCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      onClick={onClick}
      className={cn(
        "rounded-xl border transition-all duration-200",
        variant === "default" &&
          "bg-card/60 backdrop-blur-sm border-border/40 shadow-[0_8px_32px_hsl(var(--shadcn-primary)/0.04)]",
        variant === "accent" &&
          "bg-primary/[0.04] border-primary/[0.12] shadow-[0_8px_32px_hsl(var(--shadcn-primary)/0.06)]",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
