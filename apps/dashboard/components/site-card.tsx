"use client";

import { Camera, AlertTriangle, HardDrive } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/sparkline";
import { cn } from "@/lib/utils";
import type { Site } from "@/lib/api";

interface SiteCardProps {
  site: Site;
  variant?: "default" | "accent";
  onClick?: () => void;
  trendData?: number[];
}

export function SiteCard({ site, variant = "default", onClick, trendData }: SiteCardProps) {
  const cameraCount = site._count?.cameras ?? 0;
  const alertCount = site._count?.doors ?? 0;
  const isOnline = site.isActive;

  return (
    <GlassCard
      variant={variant}
      className={cn(
        "cursor-pointer transition-all duration-200 hover:border-primary/30",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">{site.name}</h4>
            <Badge variant={isOnline ? "success" : "destructive"} className="text-[10px]">
              <span className={cn("mr-1 inline-block h-1.5 w-1.5 rounded-full", isOnline ? "bg-green-500" : "bg-red-500")} />
              {isOnline ? "En ligne" : "Hors ligne"}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              {cameraCount} caméra{cameraCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {alertCount} alerte{alertCount !== 1 ? "s" : ""}
            </span>
            {site.city && (
              <span>{site.city}{site.country ? `, ${site.country}` : ""}</span>
            )}
          </div>
        </div>

        {trendData && trendData.length >= 2 && (
          <div className="ml-4 w-20">
            <Sparkline data={trendData} height={28} />
          </div>
        )}
      </div>
    </GlassCard>
  );
}
