"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/use-auth";
import { useTranslation } from "@/lib/i18n/context";
import {
  fetchSites,
  fetchZoneAnalytics,
  fetchIntrusionEvents,
  fetchLoiteringEvents,
  fetchAbnormalActivity,
  fetchAnalyticsTrends,
  fetchUnusualAbsence,
  type ZoneAnalyticsDto,
  type IntrusionEventDto,
  type LoiteringEventDto,
  type AbnormalActivityDto,
  type AnalyticsTrendPoint,
  type Site,
} from "@/lib/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Shield, ShieldOff, DoorOpen, Users, TrendingUp, BarChart3 } from "lucide-react";

const severityBadgeVariant: Record<string, "destructive" | "warning" | "default" | "success"> = {
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "default",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("zone-activity");
  const [granularity, setGranularity] = useState<"hourly" | "daily">("hourly");

  // Data states
  const [zoneData, setZoneData] = useState<ZoneAnalyticsDto[]>([]);
  const [trendsData, setTrendsData] = useState<AnalyticsTrendPoint[]>([]);
  const [anomalyData, setAnomalyData] = useState<AbnormalActivityDto[]>([]);
  const [absenceData, setAbsenceData] = useState<AbnormalActivityDto[]>([]);
  const [intrusionData, setIntrusionData] = useState<IntrusionEventDto[]>([]);
  const [loiteringData, setLoiteringData] = useState<LoiteringEventDto[]>([]);

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load sites on mount
  useEffect(() => {
    async function loadSites() {
      try {
        const result = await fetchSites({ limit: 100 });
        const sitesData: Site[] = result.data || [];
        setSites(sitesData);
        const firstSite = sitesData[0];
        if (firstSite) {
          setSelectedSiteId(firstSite.id);
        }
      } catch {
        // Silently handle — site selector will be empty
      }
    }
    loadSites();
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = selectedSiteId ? { siteId: selectedSiteId } : {};

      const [
        zoneResult,
        anomalyResult,
        absenceResult,
        intrusionResult,
        loiteringResult,
        deniedTrends,
        anomalyTrends,
      ] = await Promise.all([
        fetchZoneAnalytics({ ...params, granularity }).catch(() => []),
        fetchAbnormalActivity(params).catch(() => []),
        fetchUnusualAbsence(params).catch(() => []),
        fetchIntrusionEvents(params).catch(() => []),
        fetchLoiteringEvents(params).catch(() => []),
        selectedSiteId
          ? fetchAnalyticsTrends(selectedSiteId, "denied_count", granularity).catch(() => [])
          : Promise.resolve([]),
        selectedSiteId
          ? fetchAnalyticsTrends(selectedSiteId, "door_anomaly_count", granularity).catch(() => [])
          : Promise.resolve([]),
      ]);

      setZoneData(zoneResult);
      setAnomalyData(anomalyResult);
      setAbsenceData(absenceResult);
      setIntrusionData(intrusionResult);
      setLoiteringData(loiteringResult);

      // Combine trends
      const combined = [...deniedTrends, ...anomalyTrends];
      setTrendsData(combined);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, [selectedSiteId, granularity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Summary calculations
  const totalDenied = zoneData.reduce((sum, z) => sum + z.deniedCount, 0);
  const totalAnomalies = zoneData.reduce((sum, z) => sum + z.doorAnomalyCount, 0);
  const activeIntrusions = intrusionData.filter((i) => i.status !== "resolved").length;
  const loiteringCount = loiteringData.length;

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("analytics.title")}
        description={t("analytics.title")}
      />

      {/* Site selector */}
      {sites.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("analytics.summary.deniedToday")}
            </CardTitle>
            <ShieldOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDenied}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("analytics.summary.doorAnomalies")}
            </CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAnomalies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("analytics.summary.activeIntrusions")}
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{activeIntrusions}</div>
              {activeIntrusions > 0 && (
                <Badge variant="destructive">{activeIntrusions} actif</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("analytics.summary.loiteringEvents")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loiteringCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-4">
          {(["zoneActivity", "trends", "anomalies", "intrusions"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {t(`analytics.tabs.${tab}`)}
              </button>
            )
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Zone Activity Tab */}
        {activeTab === "zoneActivity" && (
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.tabs.zoneActivity")}</CardTitle>
            </CardHeader>
            <CardContent>
              {zoneData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("analytics.noData")}
                </p>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={zoneData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="zoneName"
                        className="text-xs"
                        tick={{ fill: "currentColor" }}
                      />
                      <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
                      <Tooltip />
                      <Bar
                        dataKey="deniedCount"
                        name="Refusés"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="doorAnomalyCount"
                        name="Anomalies"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Trends Tab */}
        {activeTab === "trends" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as "hourly" | "daily")}
              >
                <option value="hourly">{t("analytics.granularity.hourly")}</option>
                <option value="daily">{t("analytics.granularity.daily")}</option>
              </select>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Refus d&apos;accès</CardTitle>
                </CardHeader>
                <CardContent>
                  {trendsData.filter((t) => t.metric === "denied_count").length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {t("analytics.noData")}
                    </p>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={trendsData.filter((t) => t.metric === "denied_count")}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="bucket"
                            className="text-xs"
                            tick={{ fill: "currentColor" }}
                          />
                          <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Anomalies de porte</CardTitle>
                </CardHeader>
                <CardContent>
                  {trendsData.filter((t) => t.metric === "door_anomaly_count").length ===
                  0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {t("analytics.noData")}
                    </p>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={trendsData.filter(
                            (t) => t.metric === "door_anomaly_count",
                          )}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="bucket"
                            className="text-xs"
                            tick={{ fill: "currentColor" }}
                          />
                          <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#f59e0b"
                            fill="#f59e0b"
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Anomalies Tab */}
        {activeTab === "anomalies" && (
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.tabs.anomalies")}</CardTitle>
            </CardHeader>
            <CardContent>
              {anomalyData.length === 0 && absenceData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("analytics.noAnomalies")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          {t("analytics.anomaly.zone")}
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          {t("analytics.anomaly.metric")}
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                          {t("analytics.anomaly.currentValue")}
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                          {t("analytics.anomaly.baseline")}
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                          {t("analytics.anomaly.deviation")}
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                          {t("analytics.anomaly.severity")}
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          {t("analytics.anomaly.time")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...anomalyData, ...absenceData].map((item, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2 font-medium">{item.zoneId}</td>
                          <td className="px-3 py-2 text-muted-foreground">{item.metric}</td>
                          <td className="px-3 py-2 text-right">{item.currentValue}</td>
                          <td className="px-3 py-2 text-right">{item.baselineMean.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            <span
                              className={
                                Math.abs(item.deviation) > 3
                                  ? "text-destructive"
                                  : Math.abs(item.deviation) > 2
                                    ? "text-warning"
                                    : ""
                              }
                            >
                              {item.deviation.toFixed(1)}σ
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant={severityBadgeVariant[item.severity] || "default"}>
                              {item.severity}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(item.detectedAt).toLocaleString("fr")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Intrusions & Loitering Tab */}
        {activeTab === "intrusions" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Intrusions */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Intrusions
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {intrusionData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t("analytics.noIntrusions")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {intrusionData.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {t("analytics.intrusion.zone")}: {item.zoneId.slice(0, 8)}
                            </span>
                            <Badge
                              variant={
                                item.confidence > 0.8
                                  ? "destructive"
                                  : item.confidence > 0.5
                                    ? "warning"
                                    : "default"
                              }
                            >
                              {Math.round(item.confidence * 100)}%
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.detectedAt).toLocaleString("fr")}
                          </p>
                          {item.snapshotUrl && (
                            <p className="text-xs text-primary hover:underline">
                              🎥 Voir la capture
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Loitering */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Flânerie
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loiteringData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t("analytics.noLoitering")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {loiteringData.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {t("analytics.loitering.door")}: {item.doorId?.slice(0, 8) || "N/A"}
                            </span>
                            <Badge variant="warning">
                              {Math.floor(item.durationSeconds / 60)}min
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.startedAt).toLocaleString("fr")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
