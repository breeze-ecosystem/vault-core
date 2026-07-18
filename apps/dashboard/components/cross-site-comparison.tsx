"use client";

import { motion } from "motion/react";
import { BarChart3 } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Sparkline } from "@/components/sparkline";
import { Badge } from "@/components/ui/badge";
import { containerVariants } from "@/components/page-transition";
import { cn } from "@/lib/utils";
import type { ComparisonData } from "@/lib/api";

interface CrossSiteComparisonProps {
  data: ComparisonData;
}

export function CrossSiteComparison({ data }: CrossSiteComparisonProps) {
  if (!data.sites || data.sites.length < 2) {
    return (
      <GlassCard className="p-8 text-center">
        <BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">
          Ajoutez au moins 2 sites pour activer la comparaison inter-sites
        </p>
      </GlassCard>
    );
  }

  const maxCameras = Math.max(...data.sites.map((s) => s.cameras));
  const maxAlerts = Math.max(...data.sites.map((s) => s.alerts));

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <h3 className="text-sm font-semibold">Comparaison inter-sites</h3>

      {/* Bar Chart: Cameras */}
      <GlassCard className="p-5">
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Caméras par site
        </h4>
        <div className="space-y-3">
          {data.sites.map((site) => (
            <div key={site.id} className="flex items-center gap-3">
              <span className="w-28 text-xs font-medium truncate">{site.name}</span>
              <div className="flex-1">
                <div className="h-5 w-full rounded-full bg-secondary">
                  <div
                    className="h-5 rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${(site.cameras / maxCameras) * 100}%` }}
                  />
                </div>
              </div>
              <span className="w-12 text-right font-mono text-xs tabular-nums">
                {site.cameras}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Bar Chart: Alerts */}
      <GlassCard className="p-5">
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Alertes par site
        </h4>
        <div className="space-y-3">
          {data.sites.map((site) => (
            <div key={site.id} className="flex items-center gap-3">
              <span className="w-28 text-xs font-medium truncate">{site.name}</span>
              <div className="flex-1">
                <div className="h-5 w-full rounded-full bg-secondary">
                  <div
                    className="h-5 rounded-full bg-warning transition-all duration-500"
                    style={{ width: `${(site.alerts / maxAlerts) * 100}%` }}
                  />
                </div>
              </div>
              <span className="w-12 text-right font-mono text-xs tabular-nums">
                {site.alerts}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Trend Sparklines */}
      <GlassCard className="p-5">
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tendance des alertes
        </h4>
        <div className="space-y-4">
          {data.sites.map((site) => (
            <div key={site.id} className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-28">
                <span className="text-xs font-medium truncate">{site.name}</span>
                <Badge
                  variant={site.status === "online" ? "success" : site.status === "degraded" ? "warning" : "destructive"}
                  className="text-[10px]"
                >
                  {site.status === "online" ? "OK" : site.status === "degraded" ? "Dégradé" : "Hors ligne"}
                </Badge>
              </div>
              <div className="flex-1">
                {site.alertTrend && site.alertTrend.length >= 2 ? (
                  <Sparkline data={site.alertTrend} height={28} />
                ) : (
                  <div className="h-7 flex items-center text-xs text-muted-foreground">
                    Données insuffisantes
                  </div>
                )}
              </div>
              <span className="w-16 text-right text-xs text-muted-foreground">
                {site.uptimePercent.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}
