"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { itemVariants } from "@/components/page-transition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface CameraCardPremiumProps {
  camera: {
    id: string;
    name: string;
    status: string;
    lastSnapshotUrl?: string | null;
    site?: { name: string } | null;
  };
  onClick?: (id: string) => void;
  className?: string;
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  ONLINE: { label: "En ligne", color: "bg-success/10 text-success border-success/20", dot: "bg-success" },
  OFFLINE: { label: "Hors ligne", color: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  MAINTENANCE: { label: "Maintenance", color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
  DEGRADED: { label: "Dégradé", color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
};

export function CameraCardPremium({ camera, onClick, className }: CameraCardPremiumProps) {
  const sc = (statusConfig[camera.status] || statusConfig.OFFLINE)!;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02 }}
      className={cn("group rounded-xl overflow-hidden border bg-card hover:border-primary/30 transition-all duration-200 cursor-pointer", className)}
      onClick={() => onClick?.(camera.id)}
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {camera.lastSnapshotUrl ? (
          <Image
            src={camera.lastSnapshotUrl}
            alt={camera.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Video className="h-10 w-10 text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className={`${sc.color} backdrop-blur-sm text-[11px] border`}>
            <span
              className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${sc.dot} ${camera.status === "ONLINE" ? "status-pulse" : ""}`}
            />
            {sc.label}
          </Badge>
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Link href={`/cameras/${camera.id}`}>
            <Button size="sm" variant="secondary" className="gap-2 backdrop-blur-sm">
              <Eye className="h-4 w-4" />
              Voir le flux
            </Button>
          </Link>
        </div>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium">{camera.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {camera.site?.name || "Aucun site"}
        </p>
      </div>
    </motion.div>
  );
}
