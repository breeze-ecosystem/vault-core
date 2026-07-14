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
  fetchRiskScores,
  fetchSiteRiskSummaries,
  type RiskScoreDto,
  type SiteRiskSummary,
  type Site,
} from "@/lib/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
  Cell,
} from "recharts";
import { Gauge, AlertTriangle, TrendingUp, MapPin, ShieldAlert } from "lucide-react";
import Link from "next/link";

const riskColorMap: Record<string, string> = {
  low: "#22c55e",
  moderate: "#eab308",
  elevated: "#f97316",
  critical: "#ef4444",
};

const riskBgMap: Record<string, string> = {
  low: "bg-green-500/10 text-green-500",
  moderate: "bg-yellow-500/10 text-yellow-500",
  elevated: "bg-orange-500/10 text-orange-500",
  critical: "bg-red-500/10 text-red-500",
};

function getScoreColor(score: number): string {
  if (score >= 70) return "#ef4444";
  if (score >= 40) return "#f97316";
  if (score >= 20) return "#eab308";
  return "#22c55e";
}

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

function ScoreBadge({ score }: { score: number }) {
  const color = getScoreColor(score);
  return (
    <span
      className="inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {score}
    </span>
  );
}

// Simple interpolation helper for t()
function tr(t: (key: string) => string, key: string, vars?: Record<string, string | number>): string {
  let val = t(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      val = val.replace(`{${k}}`, String(v));
    }
  }
  return val;
}

export default function RiskDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [scores, setScores] = useState<RiskScoreDto[]>([]);
  const [summaries, setSummaries] = useState<SiteRiskSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load sites on mount
  useEffect(() => {
    async function loadSites() {
      try {
        const result = await fetchSites({ limit: 100 });
        const sitesData: Site[] = result.data || [];
        setSites(sitesData);
        if (sitesData.length > 0 && sitesData[0]?.id) {
          setSelectedSiteId(sitesData[0].id);
        }
      } catch {
        // Silently handle
      }
    }
    loadSites();
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [scoresResult, summariesResult] = await Promise.all([
        fetchRiskScores(selectedSiteId || undefined).catch(() => [] as RiskScoreDto[]),
        fetchSiteRiskSummaries().catch(() => [] as SiteRiskSummary[]),
      ]);

      setScores(scoresResult);
      setSummaries(summariesResult);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, [selectedSiteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (isLoading && scores.length === 0) return <LoadingSkeleton />;

  const criticalZones = scores.filter((s) => s.riskLevel === "critical");
  const elevatedZones = scores.filter((s) => s.riskLevel === "elevated");

  // Risk distribution data for chart
  const riskDistribution = [
    { name: t("risk.levels.critical"), value: criticalZones.length, fill: "#ef4444" },
    { name: t("risk.levels.elevated"), value: elevatedZones.length, fill: "#f97316" },
    {
      name: t("risk.levels.moderate"),
      value: scores.filter((s) => s.riskLevel === "moderate").length,
      fill: "#eab308",
    },
    {
      name: t("risk.levels.low"),
      value: scores.filter((s) => s.riskLevel === "low").length,
      fill: "#22c55e",
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t("risk.title")} description={t("risk.title")} />

      {/* Critical Risks Alert Banner */}
      {criticalZones.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="font-medium">
            {tr(t, "risk.criticalBanner", { count: criticalZones.length })}
          </span>
        </div>
      )}

      {/* Site selector */}
      {sites.length > 0 && (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
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

      {/* Site Risk Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaries.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-4">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t("risk.noData")}
            </CardContent>
          </Card>
        ) : (
          summaries.map((summary) => (
            <Card key={summary.siteId}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{summary.siteName}</CardTitle>
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className="text-3xl font-bold"
                  style={{ color: getScoreColor(summary.averageScore) }}
                >
                  {summary.averageScore}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {summary.criticalZones > 0 && (
                      <Badge variant="destructive" className="mr-1">
                        {summary.criticalZones} critique
                      </Badge>
                    )}
                    {summary.elevatedZones > 0 && (
                      <Badge variant="warning" className="mr-1">
                        {summary.elevatedZones} élevé
                      </Badge>
                    )}
                  </span>
                  <span>
                    Max: {summary.maxScore}
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {summary.zoneCount} zones · {t("risk.lastUpdated")}:{" "}
                  {new Date(summary.lastUpdated).toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {scores.length > 0 && (
        <>
          {/* Risk Overview by Zone */}
          <Card>
            <CardHeader>
              <CardTitle>{t("risk.zoneOverview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={scores
                      .sort((a, b) => b.smoothedScore - a.smoothedScore)
                      .slice(0, 20)}
                    layout="vertical"
                    margin={{ left: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" domain={[0, 100]} className="text-xs" tick={{ fill: "currentColor" }} />
                    <YAxis
                      type="category"
                      dataKey="zoneName"
                      className="text-xs"
                      tick={{ fill: "currentColor" }}
                      width={90}
                    />
                    <Tooltip
                      formatter={(value: number, _name: string) => [value, "Score"]}
                      labelFormatter={(label: string) => `Zone: ${label}`}
                    />
                    <Bar dataKey="smoothedScore" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {scores.slice(0, 20).map((entry, index) => (
                        <Cell key={index} fill={getScoreColor(entry.smoothedScore)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Risk Distribution & Factors Table */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t("risk.riskDistribution")}</CardTitle>
              </CardHeader>
              <CardContent>
                {riskDistribution.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t("risk.noData")}
                  </p>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="20%"
                        outerRadius="80%"
                        barSize={20}
                        data={riskDistribution}
                        startAngle={180}
                        endAngle={0}
                      >
                        <RadialBar
                          dataKey="value"
                          cornerRadius={10}
                          label={{ fill: "currentColor", fontSize: 12 }}
                        />
                        <Legend
                          iconType="circle"
                          formatter={(value: string) => (
                            <span className="text-sm">{value}</span>
                          )}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Zone Risk Factors Table */}
            <Card>
              <CardHeader>
                <CardTitle>{t("risk.factors")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-2 py-2 text-left font-medium">Zone</th>
                        <th className="px-2 py-2 text-right font-medium">{t("risk.currentScore")}</th>
                        <th className="px-2 py-2 text-right font-medium">{t("risk.smoothedScore")}</th>
                        <th className="px-2 py-2 text-right font-medium">{t("risk.riskLevel")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scores
                        .sort((a, b) => b.smoothedScore - a.smoothedScore)
                        .slice(0, 15)
                        .map((score) => (
                          <tr
                            key={score.zoneId}
                            className="border-b border-border transition-colors hover:bg-muted/50"
                          >
                            <td className="px-2 py-2">
                              <Link
                                href={`/risque/zones/${score.zoneId}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {score.zoneName}
                              </Link>
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({score.siteName})
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right">
                              <ScoreBadge score={score.score} />
                            </td>
                            <td className="px-2 py-2 text-right">
                              <ScoreBadge score={score.smoothedScore} />
                            </td>
                            <td className="px-2 py-2 text-right">
                              <Badge
                                variant={
                                  score.riskLevel === "critical"
                                    ? "destructive"
                                    : score.riskLevel === "elevated"
                                      ? "warning"
                                      : "default"
                                }
                                className={
                                  score.riskLevel === "low" ? "bg-green-500/10 text-green-500" : ""
                                }
                              >
                                {t(`risk.levels.${score.riskLevel}`)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trend Overview Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{t("risk.trend")}</CardTitle>
            </CardHeader>
            <CardContent>
              {scores.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("risk.noData")}
                </p>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={scores
                        .sort((a, b) => a.smoothedScore - b.smoothedScore)
                        .slice(0, 10)}
                    >
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="smoothedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="zoneName"
                        className="text-xs"
                        tick={{ fill: "currentColor" }}
                      />
                      <YAxis className="text-xs" tick={{ fill: "currentColor" }} domain={[0, 100]} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#f97316"
                        fill="url(#scoreGradient)"
                        strokeWidth={2}
                        name="Score"
                      />
                      <Area
                        type="monotone"
                        dataKey="smoothedScore"
                        stroke="#3b82f6"
                        fill="url(#smoothedGradient)"
                        strokeWidth={2}
                        name="Score lissé"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state when no scores exist */}
      {!isLoading && scores.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Gauge className="h-12 w-12 text-muted-foreground" />
            <p className="text-center text-sm text-muted-foreground">{t("risk.noData")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
