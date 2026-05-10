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
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const statusConfig = {
  ONLINE: { label: "En ligne", color: "bg-green-500/10 text-green-500 border-green-500/20", dot: "bg-green-500" },
  OFFLINE: { label: "Hors ligne", color: "bg-red-500/10 text-red-500 border-red-500/20", dot: "bg-red-500" },
  MAINTENANCE: { label: "Maintenance", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", dot: "bg-yellow-500" },
  DEGRADED: { label: "Dégradé", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", dot: "bg-orange-500" },
} as const;

function getStatusConfig(status: string) {
  return status in statusConfig
    ? statusConfig[status as keyof typeof statusConfig]
    : statusConfig.OFFLINE;
}

function CameraCard({ camera }: { camera: Camera }) {
  const sc = getStatusConfig(camera.status);

  return (
    <Card className="group overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg">
      {/* Snapshot area */}
      <div className="relative aspect-video bg-muted/50 overflow-hidden">
        {camera.lastSnapshotUrl ? (
          <Image
            src={camera.lastSnapshotUrl}
            alt={camera.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Video className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        {/* Status overlay */}
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className={`${sc.color} backdrop-blur-sm text-[11px]`}>
            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </Badge>
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
          <Link href={`/cameras`}>
            <Button size="sm" variant="secondary" className="gap-2">
              <Eye className="h-4 w-4" />
              Voir
            </Button>
          </Link>
        </div>
      </div>
      {/* Info */}
      <CardContent className="p-3">
        <p className="truncate text-sm font-medium">{camera.name}</p>
        <p className="text-xs text-muted-foreground">
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
      fetchDashboardStats().catch((err) => {
        throw err;
      }),
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
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            Erreur de chargement
          </p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const onlineCount = cameras.filter((c) => c.status === "ONLINE").length;
  const offlineCount = cameras.filter((c) => c.status === "OFFLINE").length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Vue d&apos;ensemble
        </h1>
        <p className="text-muted-foreground">
          Résumé de l&apos;activité du système de surveillance
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-full" />
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
              iconColor="text-green-500"
            />
            <StatsCard
              title="Alertes actives"
              value={stats?.alerts.open ?? 0}
              description={`${stats?.alerts.critical ?? 0} critiques`}
              icon={AlertTriangle}
              iconColor="text-orange-500"
            />
            <StatsCard
              title="Sites actifs"
              value={stats?.sites.active ?? 0}
              description={`${stats?.sites.total ?? 0} total`}
              icon={MapPin}
              iconColor="text-blue-500"
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

      {/* Camera overview grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Aperçu des caméras
          </CardTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Wifi className="h-3.5 w-3.5 text-green-500" />
              {onlineCount}
            </span>
            <span className="flex items-center gap-1">
              <WifiOff className="h-3.5 w-3.5 text-red-500" />
              {offlineCount}
            </span>
            <Link href="/cameras">
              <Button variant="ghost" size="sm" className="text-xs">
                Voir tout →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-video" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : cameras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Video className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Aucune caméra enregistrée
              </p>
              <Link href="/cameras">
                <Button variant="outline" size="sm" className="mt-3">
                  Ajouter une caméra
                </Button>
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

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
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
