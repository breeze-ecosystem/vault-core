"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, AlertTriangle, HardDrive, Activity, Plus } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { SiteSwitcher } from "@/components/site-switcher";
import { SiteCard } from "@/components/site-card";
import { CrossSiteComparison } from "@/components/cross-site-comparison";
import { PageTransition, containerVariants } from "@/components/page-transition";
import { GlassCard } from "@/components/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Site, AggregateStats, ComparisonData } from "@/lib/api";

interface MultiSiteDashboardProps {
  sites: Site[];
  aggregateStats: AggregateStats | null;
  comparisonData?: ComparisonData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function MultiSiteDashboard({
  sites,
  aggregateStats,
  comparisonData,
  loading = false,
  error = null,
  onRetry,
}: MultiSiteDashboardProps) {
  const router = useRouter();
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("7d");
  const [currentSiteId, setCurrentSiteId] = useState<string>("all");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
          <p className="mb-2 text-lg font-medium">Impossible de charger les données des sites</p>
          <p className="mb-6 text-sm text-muted-foreground">{error}</p>
          {onRetry && (
            <Button variant="default" onClick={onRetry}>
              Réessayer
            </Button>
          )}
        </div>
      </PageTransition>
    );
  }

  if (!sites || sites.length === 0) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-16">
          <HardDrive className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 text-lg font-medium">Aucun site configuré</p>
          <p className="mb-6 text-sm text-muted-foreground">
            Ajoutez jusqu'à 5 sites pour centraliser la surveillance.
          </p>
          <Link href="/sites/nouveau">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un site
            </Button>
          </Link>
        </div>
      </PageTransition>
    );
  }

  const formatStorage = (gb: number) => {
    if (gb >= 1024) return `${(gb / 1024).toFixed(1)} To`;
    return `${gb.toFixed(1)} Go`;
  };

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      {/* Period selector and site switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SiteSwitcher
          sites={sites.map((s) => ({ id: s.id, name: s.name }))}
          currentSiteId={currentSiteId}
          onChange={setCurrentSiteId}
        />
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {(["today", "7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p === "today" ? "Aujourd'hui" : p === "7d" ? "7 jours" : "30 jours"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      {aggregateStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Caméras"
            value={`${aggregateStats.onlineCameras}/${aggregateStats.totalCameras}`}
            description="en ligne"
            icon={Camera}
          />
          <StatsCard
            title="Alertes actives"
            value={aggregateStats.criticalAlerts}
            description="critiques"
            icon={AlertTriangle}
          />
          <StatsCard
            title="Stockage"
            value={formatStorage(aggregateStats.storageUsed)}
            description={`sur ${formatStorage(aggregateStats.storageTotal)}`}
            icon={HardDrive}
          />
          <StatsCard
            title="Disponibilité"
            value={`${aggregateStats.uptimePercent.toFixed(1)}%`}
            description="moyenne"
            icon={Activity}
          />
        </div>
      )}

      {/* Site List */}
      <GlassCard className="overflow-hidden">
        <div className="border-b border-border p-4">
          <h3 className="text-sm font-semibold">Sites de surveillance</h3>
        </div>
        <div className="divide-y divide-border">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onClick={() => router.push(`/sites/${site.id}`)}
            />
          ))}
        </div>
        <div className="border-t border-border p-3">
          <Link href="/sites/nouveau">
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un site
            </Button>
          </Link>
        </div>
      </GlassCard>

      {/* Cross-site Comparison */}
      {comparisonData && comparisonData.sites.length >= 2 && (
        <CrossSiteComparison data={comparisonData} />
      )}
    </motion.div>
  );
}
