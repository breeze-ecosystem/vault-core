"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { GlassCard } from "@/components/glass-card";
import { StatsCard } from "@/components/stats-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Camera, AlertTriangle, HardDrive, Activity, DoorOpen, Users, ArrowLeft, Trash2, Edit } from "lucide-react";
import { getSite, getSiteStats, deleteSite, type Site, type SiteStats } from "@/lib/api";
import { toast } from "@/components/ui/toast";

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;

  const [site, setSite] = useState<Site | null>(null);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [siteData, statsData] = await Promise.all([
        getSite(siteId),
        getSiteStats(siteId),
      ]);
      setSite(siteData);
      setStats(statsData);
    } catch (e: any) {
      setError(e.message || "Impossible de charger les données du site");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteSite(siteId);
      toast("Site désactivé avec succès", "success");
      router.push("/sites");
    } catch (e: any) {
      toast.error(e.message || "Échec de la suppression du site");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  function formatStorage(gb: number) {
    if (gb >= 1024) return `${(gb / 1024).toFixed(1)} To`;
    return `${gb.toFixed(1)} Go`;
  }

  // Loading state
  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </PageTransition>
    );
  }

  // Error state
  if (error || !site) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
          <p className="mb-2 text-lg font-medium">Impossible de charger les données du site</p>
          <p className="mb-6 text-sm text-muted-foreground">{error || "Site introuvable"}</p>
          <div className="flex gap-3">
            <Button variant="default" onClick={loadData}>Réessayer</Button>
            <Button variant="outline" onClick={() => router.push("/sites")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux sites
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Empty state (no stats yet)
  const hasNoStats = !stats || (
    stats.cameras.total === 0 &&
    stats.alerts.total === 0 &&
    stats.doors.total === 0
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title={site.name}
          description={
            [site.city, site.country].filter(Boolean).join(", ") || "Tableau de bord du site"
          }
        />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/sites")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/sites/nouveau`)}>
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>

        {hasNoStats ? (
          // Empty state
          <GlassCard className="p-8 text-center">
            <Activity className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              Aucune donnée statistique disponible pour ce site.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Les métriques apparaîtront une fois les caméras et alertes configurées.
            </p>
          </GlassCard>
        ) : (
          <>
            {/* KPI Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Caméras"
                value={`${stats.cameras.online}/${stats.cameras.total}`}
                description={`${stats.cameras.offline} hors ligne`}
                icon={Camera}
              />
              <StatsCard
                title="Alertes"
                value={stats.alerts.open}
                description={`${stats.alerts.critical} critiques`}
                icon={AlertTriangle}
              />
              <StatsCard
                title="Stockage"
                value={formatStorage(stats.storage.used)}
                description={`${stats.storage.percentUsed.toFixed(0)}% utilisé`}
                icon={HardDrive}
              />
              <StatsCard
                title="Disponibilité"
                value={`${stats.uptime.percent.toFixed(1)}%`}
                description={stats.uptime.uptimeHours > 0 ? `${Math.round(stats.uptime.uptimeHours)}h de fonctionnement` : "N/A"}
                icon={Activity}
              />
            </div>

            {/* Secondary metrics */}
            <div className="grid gap-4 sm:grid-cols-2">
              <GlassCard className="p-5">
                <div className="flex items-center gap-3">
                  <DoorOpen className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Portes</p>
                    <p className="font-mono text-2xl font-semibold tabular-nums">
                      {stats.doors.online}/{stats.doors.total}
                    </p>
                    <p className="text-xs text-muted-foreground">en ligne</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Membres</p>
                    <p className="font-mono text-2xl font-semibold tabular-nums">{stats.members}</p>
                    <p className="text-xs text-muted-foreground">utilisateurs</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </>
        )}

        {/* Delete confirmation */}
        <ConfirmationDialog
          isOpen={showDeleteConfirm}
          title="Supprimer le site"
          description={`Le site "${site.name}" sera désactivé. Les caméras, événements et utilisateurs associés seront archivés.`}
          confirmLabel={deleting ? "Suppression..." : "Supprimer"}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          isLoading={deleting}
          requiredRole="ADMIN"
          userRole="GLOBAL_ADMIN"
        />
      </div>
    </PageTransition>
  );
}
