"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/stats-card";
import { RecentActivity } from "@/components/recent-activity";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDashboardStats, type DashboardStats } from "@/lib/api";
import { Video, AlertTriangle, MapPin, Users } from "lucide-react";

export default function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">Erreur de chargement</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vue d&apos;ensemble</h1>
        <p className="text-muted-foreground">
          Resume de l&apos;activite du systeme de surveillance
        </p>
      </div>

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
              title="Cameras en ligne"
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
              description="Comptes enregistres"
              icon={Users}
              iconColor="text-purple-500"
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activite recente</CardTitle>
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
