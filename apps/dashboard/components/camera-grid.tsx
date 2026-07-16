"use client";

import { motion } from "motion/react";
import { Video, VideoOff } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { cn } from "@/lib/utils";

interface CameraThumbnail {
  id: string;
  name: string;
  status: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "DEGRADED";
  snapshotUrl?: string | null;
}

interface CameraGridProps {
  cameras: CameraThumbnail[];
  onCameraClick?: (cameraId: string) => void;
  className?: string;
}

const statusOverlay: Record<string, { color: string; label: string }> = {
  ONLINE: { color: "bg-green-500", label: "En ligne" },
  OFFLINE: { color: "bg-red-500", label: "Hors ligne" },
  MAINTENANCE: { color: "bg-amber-500", label: "Maintenance" },
  DEGRADED: { color: "bg-orange-500", label: "Dégradé" },
};

export function CameraGrid({
  cameras,
  onCameraClick,
  className,
}: CameraGridProps) {
  return (
    <GlassCard variant="default" className={cn("p-4", className)}>
      <h3 className="text-sm font-semibold mb-3">Caméras</h3>
      <div className="grid grid-cols-2 gap-2">
        {cameras.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center gap-2 py-8 text-center">
            <VideoOff className="h-8 w-8 text-muted-foreground opacity-40" />
            <p className="text-xs text-muted-foreground">
              Aucune caméra disponible
            </p>
          </div>
        )}
        {cameras.map((camera, i) => {
          const status = statusOverlay[camera.status] ?? statusOverlay.OFFLINE;
          const st = status!;
          return (
            <motion.button
              key={camera.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              onClick={() => onCameraClick?.(camera.id)}
              className={cn(
                "group relative aspect-video rounded-lg overflow-hidden border transition-all duration-200",
                "hover:border-primary/50 hover:ring-1 hover:ring-primary/30",
                camera.status === "ONLINE"
                  ? "border-border/40 bg-secondary/30"
                  : "border-border/20 bg-secondary/20 opacity-70"
              )}
            >
              {camera.snapshotUrl ? (
                <img
                  src={camera.snapshotUrl}
                  alt={camera.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary/50 to-secondary/20">
                  <Video className="h-6 w-6 text-muted-foreground/40" />
                </div>
              )}
              {/* Status dot overlay */}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full ring-1 ring-black/20",
                    st.color
                  )}
                />
              </div>
              {/* Name overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                <p className="text-[10px] text-white font-medium truncate leading-tight">
                  {camera.name}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </GlassCard>
  );
}
