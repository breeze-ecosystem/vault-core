"use client";

import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckSquare, CheckCircle, Loader2 } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onAcknowledgeSelected: () => void;
  onResolveSelected: () => void;
  processing?: boolean;
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  onAcknowledgeSelected,
  onResolveSelected,
  processing = false,
  className,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 ? (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
            className
          )}
        >
          <div className="flex items-center gap-3 rounded-xl border bg-card/90 backdrop-blur-xl shadow-lg px-4 py-3">
            <span className="text-sm font-medium whitespace-nowrap">
              {selectedCount} sélectionnée{selectedCount > 1 ? "s" : ""}
            </span>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={onAcknowledgeSelected}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Accuser réception
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              onClick={onResolveSelected}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckSquare className="h-4 w-4" />
              )}
              Résoudre
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
