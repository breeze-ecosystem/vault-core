"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchDashboardStats,
  fetchCameras,
  type DashboardStats,
  type Camera,
} from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n/context";
import {
  Video,
  AlertTriangle,
  MapPin,
  Users,
  Plus,
  FileText,
  Activity,
  Wifi,
  WifiOff,
  Eye,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { MetricHero } from "@/components/metric-hero";
import { DonutChart } from "@/components/donut-chart";
import { QuickActionBar } from "@/components/quick-action-bar";
import { ActivityTimeline } from "@/components/activity-timeline";
import { GlassCard } from "@/components/glass-card";
import { containerVariants, itemVariants } from "@/components/page-transition";

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

export default function OverviewPage() {
  const { t } = useTranslation();
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
          <p className="text-lg font-medium">{t('common.errorLoading')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const onlineCount = cameras.filter((c) => c.status === "ONLINE").length;
  const offlineCount = cameras.filter((c) => c.status === "OFFLINE").length;
  const severityData = stats?.recentAlerts
    ? Object.entries(
        stats.recentAlerts.reduce(
          (acc, a) => {
            const key = a.severity === "CRITICAL" ? "Critique" : a.severity === "HIGH" ? "Élevée" : a.severity === "MEDIUM" ? "Moyenne" : "Basse";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        )
      ).map(([name, value]) => ({
        name,
        value: value as number,
        color:
          name === "Critique" ? "#ef4444" : name === "Élevée" ? "#f59e0b" : name === "Moyenne" ? "#06b6d4" : "#94a3b8",
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('nav.dashboard')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('dashboard.recentActivity')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          <span>{t('dashboard.realtimeUpdate')}</span>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
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
            <MetricHero
              title={t('dashboard.camerasOnline')}
              value={`${stats?.cameras.online ?? 0} / ${stats?.cameras.total ?? 0}`}
              icon={Video}
              trend={{ value: 12, positive: true }}
              description={`${stats?.cameras.offline ?? 0} ${t('dashboard.offline')}`}
              sparklineData={[4, 6, 5, 8, 7, 9, 8, 10]}
            />
            <MetricHero
              title={t('dashboard.alertsActive')}
              value={stats?.alerts.open ?? 0}
              icon={AlertTriangle}
              description={`${stats?.alerts.critical ?? 0} ${t('alerts.critical').toLowerCase()}`}
              sparklineData={[3, 5, 4, 6, 7, 5, 4, 3]}
            />
            <MetricHero
              title={t('dashboard.sitesActive')}
              value={stats?.organizations.active ?? 0}
              icon={MapPin}
              description={`${stats?.organizations.total ?? 0} ${t('common.all')}`}
            />
            <MetricHero
              title={t('dashboard.users')}
              value={stats?.users.total ?? 0}
              icon={Users}
              description={t('dashboard.registeredAccounts')}
            />
          </>
        )}
      </motion.div>

      {!loading && (
        <QuickActionBar
          actions={[
            { id: "add-camera", label: t('dashboard.addCamera'), icon: Plus, onClick: () => window.location.href = "/cameras" },
            { id: "view-alerts", label: t('nav.alerts'), icon: AlertTriangle, onClick: () => window.location.href = "/alertes" },
            { id: "report", label: t('dashboard.generateReport'), icon: FileText, onClick: () => toast(t('dashboard.comingSoon')) },
            { id: "view-feed", label: t('dashboard.viewFeed'), icon: Video, onClick: () => window.location.href = "/cameras" },
          ]}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <ActivityTimeline alerts={stats?.recentAlerts ?? []} />
          )}
        </div>
        <div>
          {!loading && severityData.length > 0 && (
            <DonutChart data={severityData} />
          )}
        </div>
      </div>

      <GlassCard variant="default" className="overflow-hidden">
        <div className="flex flex-row items-center justify-between p-4 pb-3 border-b">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Video className="h-4 w-4 text-primary" />
            {t('cameras.title')}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5 text-success" />
              {onlineCount} {t('dashboard.online')}
            </span>
            <span className="flex items-center gap-1.5">
              <WifiOff className="h-3.5 w-3.5 text-destructive" />
              {offlineCount} {t('dashboard.offline')}
            </span>
            <Link href="/cameras">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                {t('dashboard.seeAll')} →
              </Button>
            </Link>
          </div>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden border bg-card">
                  <Skeleton className="aspect-video rounded-none" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : cameras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Video className="h-12 w-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">{t('dashboard.noCameras')}</p>
              <Link href="/cameras">
                <Button variant="outline" size="sm" className="mt-3">{t('dashboard.addCamera')}</Button>
              </Link>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            >
              {cameras.map((camera) => {
                const sc = getStatusConfig(camera.status);
                return (
                  <motion.div key={camera.id} variants={itemVariants} className="group rounded-xl overflow-hidden border bg-card hover:border-primary/30 transition-all duration-200">
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
                          <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${sc.dot} ${camera.status === "ONLINE" ? "status-pulse" : ""}`} />
                          {sc.label}
                        </Badge>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <Link href={`/cameras/${camera.id}`}>
                          <Button size="sm" variant="secondary" className="gap-2 backdrop-blur-sm">
                            <Eye className="h-4 w-4" />
                            {t('dashboard.viewFeed')}
                          </Button>
                        </Link>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium">{camera.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {camera.organization?.name || t('dashboard.noSite')}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
