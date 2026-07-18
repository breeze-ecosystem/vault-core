"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { GlassCard } from "@/components/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSyncStatus, triggerSync, type SyncStatus } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SynchronisationPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSyncStatus();
      setSyncStatus(data);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement du statut de synchronisation");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleTriggerSync() {
    setSyncing(true);
    try {
      await triggerSync();
      toast("Synchronisation déclenchée", "success");
      setTimeout(loadStatus, 2000);
    } catch (e: any) {
      toast.error(e.message || "Échec du déclenchement de la synchronisation");
    } finally {
      setSyncing(false);
    }
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "synced": return <CheckCircle className="h-4 w-4 text-success" />;
      case "pending": return <Clock className="h-4 w-4 text-warning" />;
      case "error": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "synced": return "Synchronisé";
      case "pending": return "En attente";
      case "error": return "Erreur";
      default: return "Inconnu";
    }
  }

  function getStatusBadgeVariant(status: string) {
    switch (status) {
      case "synced": return "success" as const;
      case "pending": return "warning" as const;
      case "error": return "destructive" as const;
      default: return "outline" as const;
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 rounded-xl" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
          <p className="mb-2 text-lg font-medium">Erreur de chargement</p>
          <p className="mb-6 text-sm text-muted-foreground">{error}</p>
          <Button variant="default" onClick={loadStatus}>Réessayer</Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Synchronisation inter-sites"
          description="État de la synchronisation entre sites"
          action={{
            label: syncing ? "Synchronisation..." : "Déclencher la synchronisation",
            icon: RefreshCw,
            onClick: handleTriggerSync,
          }}
        />

        {!syncStatus || (!syncStatus.lastSyncAt && syncStatus.sites.length === 0) ? (
          <GlassCard className="p-8 text-center">
            <Activity className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              Aucune synchronisation
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Les sites ne sont pas encore connectés. Vérifiez la connectivité VPN/WAN.
            </p>
          </GlassCard>
        ) : (
          <>
            {/* Global sync status */}
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(syncStatus.status)}
                  <div>
                    <p className="text-sm font-medium">
                      Statut global : {getStatusLabel(syncStatus.status)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dernière synchronisation : {formatDate(syncStatus.lastSyncAt)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTriggerSync}
                  disabled={syncing}
                >
                  <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
                  {syncing ? "En cours..." : "Synchroniser"}
                </Button>
              </div>
            </GlassCard>

            {/* Per-site status */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Sites</h3>
              {syncStatus.sites.length === 0 ? (
                <GlassCard className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Aucun site connecté</p>
                </GlassCard>
              ) : (
                syncStatus.sites.map((site) => (
                  <GlassCard key={site.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(site.status)}
                        <div>
                          <p className="text-sm font-medium">{site.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(site.lastSyncAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(site.status)} className="text-[10px]">
                          {getStatusLabel(site.status)}
                        </Badge>
                      </div>
                    </div>
                    {site.error && (
                      <div className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                        {site.error}
                      </div>
                    )}
                  </GlassCard>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
