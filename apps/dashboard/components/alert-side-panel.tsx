"use client";

import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, CheckCircle, CheckSquare, Eye, Camera, Clock, MapPin } from "lucide-react";

interface AlertSidePanelProps {
  alert: {
    id: string;
    title: string;
    description?: string | null;
    severity: string;
    status: string;
    createdAt: string;
    camera?: { id: string; name: string } | null;
    snapshotUrl?: string | null;
    site?: string | null;
  } | null;
  open: boolean;
  onClose: () => void;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  onViewCamera?: (id: string) => void;
}

const severityLabels: Record<string, string> = {
  CRITICAL: "Critique",
  HIGH: "Élevée",
  MEDIUM: "Moyenne",
  LOW: "Faible",
  INFO: "Info",
};

const severityVariant: Record<string, "destructive" | "warning" | "default" | "secondary"> = {
  CRITICAL: "destructive",
  HIGH: "warning",
  MEDIUM: "default",
  LOW: "secondary",
};

const statusLabels: Record<string, string> = {
  OPEN: "Ouverte",
  ACKNOWLEDGED: "Prise en compte",
  RESOLVED: "Résolue",
  FALSE_POSITIVE: "Faux positif",
};

export function AlertSidePanel({
  alert,
  open,
  onClose,
  onAcknowledge,
  onResolve,
  onViewCamera,
}: AlertSidePanelProps) {
  return (
    <AnimatePresence>
      {open && alert ? (
        <motion.aside
          initial={{ x: 320 }}
          animate={{ x: 0 }}
          exit={{ x: 320 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed right-0 top-0 h-full w-80 border-l bg-card/80 backdrop-blur-xl z-40 overflow-y-auto"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Badge variant={severityVariant[alert.severity] || "secondary"}>
                {severityLabels[alert.severity] || alert.severity}
              </Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <h2 className="text-lg font-semibold mb-4">{alert.title}</h2>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{new Date(alert.createdAt).toLocaleString("fr-FR")}</span>
              </div>
              {alert.camera?.name && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Camera className="h-3.5 w-3.5 shrink-0" />
                  <span>{alert.camera.name}</span>
                </div>
              )}
              {alert.site && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{alert.site}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground/60 font-mono">
                ID: {alert.id.slice(0, 12)}...
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              {onAcknowledge && alert.status === "OPEN" && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => onAcknowledge(alert.id)}
                >
                  <CheckCircle className="h-4 w-4" />
                  Accuser réception
                </Button>
              )}
              {onResolve && (alert.status === "OPEN" || alert.status === "ACKNOWLEDGED") && (
                <Button
                  variant="default"
                  className="w-full justify-start gap-2"
                  onClick={() => onResolve(alert.id)}
                >
                  <CheckSquare className="h-4 w-4" />
                  Résoudre
                </Button>
              )}
              {onViewCamera && alert.camera?.id && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => onViewCamera(alert.camera!.id)}
                >
                  <Eye className="h-4 w-4" />
                  Voir la caméra
                </Button>
              )}
            </div>

            {alert.description && (
              <>
                <div className="border-t border-border pt-4 mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Description
                  </h3>
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                </div>
              </>
            )}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
