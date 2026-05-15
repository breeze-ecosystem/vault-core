"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/stats-card";
import { RecentActivity } from "@/components/recent-activity";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchDashboardStats,
  fetchCameras,
  type DashboardStats,
  type Camera,
} from "@/lib/api";
import {
  Video,
  AlertTriangle,
  MapPin,
  Users,
  Wifi,
  WifiOff,
  Eye,
  Activity,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const statusConfig = {
  ONLINE: { label: "En ligne", color: "bg-success/10 text-success border-success/20", dot: "bg-success" },
  OFFLINE: { label: "Hors ligne", color: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  MAINTENANCE: { label: "Maintenance", color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
  DEGRADED: { label: "Dégradé", color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
} as const;

function getStatusConfig(status: string) {
  return status in statusConfig
    ? statusConfig[status as keyof typeof statusConfig]
    : statusConfig.OFFLINE;
}

function CameraCard({ camera }: { camera: Camera }) {
  const sc = getStatusConfig(camera.status);

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="relative aspect-video bg-muted overflow-hidden">
        {camera.lastSnapshotUrl ? (
          <Image
            src={camera.lastSnapshotUrl}
            alt={camera.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Video className="h-10 w-10 text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className={`${sc.color} backdrop-blur-sm text-[11px] border`}>
            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${sc.dot} ${camera.status === "ONLINE" ? "status-pulse" : ""}`} />
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
      <CardContent className="p-3">
        <p className="truncate text-sm font-medium">{camera.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {camera.site?.name || "Aucun site"}
        </p>
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchDashboardStats(),
      fetchCameras({ limit: 8 }).then((res) => res.data),
    ])
      .then(([s, c]) => {
        setStats(s);
        setCameras(c);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-lg font-medium">Erreur de chargement</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  const onlineCount = cameras.filter((c) => c.status === "ONLINE").length;
  const offlineCount = cameras.filter((c) => c.status === "OFFLINE").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vue d&apos;ensemble</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Résumé de l&apos;activité du système de surveillance
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          <span>Mis à jour en temps réel</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-7 w-16" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Caméras en ligne"
              value={`${stats?.cameras.online ?? 0} / ${stats?.cameras.total ?? 0}`}
              description={`${stats?.cameras.offline ?? 0} hors ligne`}
              icon={Video}
              iconColor="text-success"
              trend={{ value: 12, positive: true }}
            />
            <StatsCard
              title="Alertes actives"
              value={stats?.alerts.open ?? 0}
              description={`${stats?.alerts.critical ?? 0} critiques`}
              icon={AlertTriangle}
              iconColor="text-warning"
            />
            <StatsCard
              title="Sites actifs"
              value={stats?.sites.active ?? 0}
              description={`${stats?.sites.total ?? 0} total`}
              icon={MapPin}
              iconColor="text-primary"
            />
            <StatsCard
              title="Utilisateurs"
              value={stats?.users.total ?? 0}
              description="Comptes enregistrés"
              icon={Users}
              iconColor="text-purple-500"
            />
          </>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle className="text-sm flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Aperçu des caméras
          </CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5 text-success" />
              {onlineCount} en ligne
            </span>
            <span className="flex items-center gap-1.5">
              <WifiOff className="h-3.5 w-3.5 text-destructive" />
              {offlineCount} hors ligne
            </span>
            <Link href="/cameras">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                Voir tout →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-video rounded-none" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : cameras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Video className="h-12 w-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Aucune caméra enregistrée</p>
              <Link href="/cameras">
                <Button variant="outline" size="sm" className="mt-3">Ajouter une caméra</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {cameras.map((camera) => (
                <CameraCard key={camera.id} camera={camera} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <RecentActivity alerts={stats?.recentAlerts ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
