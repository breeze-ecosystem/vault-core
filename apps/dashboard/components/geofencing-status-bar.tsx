"use client";

import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Shield, ShieldOff, Phone, Timer } from "lucide-react";

interface GeofencingStatusBarProps {
  armed: boolean;
  connectedPhones: number;
  armDelayMinutes: number;
  className?: string;
}

export function GeofencingStatusBar({
  armed,
  connectedPhones,
  armDelayMinutes,
  className,
}: GeofencingStatusBarProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-2 text-sm transition-colors duration-500",
        armed
          ? "border-green-500/30 bg-green-500/10 text-green-400"
          : "border-muted bg-muted/30 text-muted-foreground",
        className,
      )}
    >
      <AnimatePresence mode="wait">
        {armed ? (
          <motion.div
            key="armed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Shield className="h-4 w-4" />
          </motion.div>
        ) : (
          <motion.div
            key="disarmed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ShieldOff className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>

      <span className="font-semibold">
        {armed ? "Armé" : "Désarmé"}
      </span>

      {connectedPhones > 0 && (
        <>
          <span className="text-muted-foreground/40">·</span>
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {connectedPhones} téléphone{connectedPhones > 1 ? "s" : ""} connecté
            {connectedPhones > 1 ? "s" : ""}
          </span>
        </>
      )}

      {armed && armDelayMinutes > 0 && (
        <>
          <span className="text-muted-foreground/40">·</span>
          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Armement dans {armDelayMinutes} min
          </span>
        </>
      )}
    </motion.div>
  );
}
