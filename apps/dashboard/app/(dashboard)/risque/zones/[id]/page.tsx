"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n/context";
import {
  fetchZoneRiskScore,
  fetchZoneRiskHistory,
  type RiskScoreDto,
  type RiskTrendPoint,
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
  Cell,
} from "recharts";
import { ArrowLeft, Gauge, AlertTriangle, ShieldOff, DoorOpen, Users, Monitor } from "lucide-react";

function getScoreColor(score: number): string {
  if (score >= 70) return "#ef4444";
  if (score >= 40) return "#f97316";
  if (score >= 20) return "#eab308";
  return "#22c55e";
}

const riskColorMap: Record<string, string> = {
  low: "#22c55e",
  moderate: "#eab308",
  elevated: "#f97316",
  critical: "#ef4444",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
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

const timeRangeOptions = ["24h", "7d", "30d"] as const;
type TimeRange = (typeof timeRangeOptions)[number];

function getTimeRangeDates(range: TimeRange): { from: string; to: string } {
  const now = Date.now();
  const ranges: Record<TimeRange, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  return {
    from: new Date(now - ranges[range]).toISOString(),
    to: new Date(now).toISOString(),
  };
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

export default function ZoneRiskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const zoneId = params.id as string;

  const [score, setScore] = useState<RiskScoreDto | null>(null);
  const [history, setHistory] = useState<RiskTrendPoint[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!zoneId) return;
    setIsLoading(true);
    setError(null);

    try {
      const { from, to } = getTimeRangeDates(timeRange);
      const [scoreResult, historyResult] = await Promise.all([
        fetchZoneRiskScore(zoneId).catch(() => null),
        fetchZoneRiskHistory(zoneId, from, to).catch(() => [] as RiskTrendPoint[]),
      ]);

      setScore(scoreResult);
      setHistory(historyResult);
    } catch (err: any) {
      setError(err.message || t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  }, [zoneId, timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (isLoading && !score) return <LoadingSkeleton />;

  if (error && !score) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push("/risque")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </button>
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const displayScore = score?.smoothedScore ?? 0;
  const displayLevel = score?.riskLevel ?? "low";
  const displayTime = score?.timestamp
    ? new Date(score.timestamp).toLocaleString()
    : "--";

  // Factor data for bar chart
  const factorData = score
    ? [
        { name: t("risk.factorsBreakdown.deniedAttempts"), value: score.factors.deniedAttempts, fill: "#ef4444" },
        { name: t("risk.factorsBreakdown.openDoorAnomalies"), value: score.factors.openDoorAnomalies, fill: "#f97316" },
        { name: t("risk.factorsBreakdown.anomalyEvents"), value: score.factors.anomalyEvents, fill: "#eab308" },
        { name: t("risk.factorsBreakdown.activeIncidents"), value: score.factors.activeIncidents, fill: "#3b82f6" },
        { name: t("risk.factorsBreakdown.failedReaders"), value: score.factors.failedReaders, fill: "#8b5cf6" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/risque")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </button>

      {/* Page Header */}
      <PageHeader
        title={
          score
            ? tr(t, "risk.zoneDetail", { zoneName: score.zoneName })
            : tr(t, "risk.zoneDetail", { zoneName: "..." })
        }
        description={score ? `${score.siteName} · ${score.zoneName}` : ""}
      />

      {/* Critical alert banner */}
      {displayLevel === "critical" && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="font-medium">{tr(t, "risk.criticalBanner", { count: 1 })}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Score Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              {t("risk.currentScore")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div
              className="text-6xl font-bold"
              style={{ color: getScoreColor(displayScore) }}
            >
              {displayScore}
            </div>
            <Badge
              variant={displayLevel === "critical" ? "destructive" : "default"}
              className={
                displayLevel === "low"
                  ? "bg-green-500/10 text-green-500"
                  : displayLevel === "moderate"
                    ? "bg-yellow-500/10 text-yellow-500"
                    : displayLevel === "elevated"
                      ? "bg-orange-500/10 text-orange-500"
                      : ""
              }
            >
              {t(`risk.levels.${displayLevel}`)}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {t("risk.lastUpdated")}: {displayTime}
            </div>
            {score && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  {t("risk.smoothedScore")}: <strong>{score.smoothedScore}</strong>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Factors Breakdown Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("risk.factors")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!score || factorData.every((f) => f.value === 0) ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun facteur de risque actif
              </p>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={factorData} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" tick={{ fill: "currentColor" }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      className="text-xs"
                      tick={{ fill: "currentColor" }}
                      width={90}
                    />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
                      {factorData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Score Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("risk.trend")}
          </CardTitle>
          <div className="flex items-center gap-2">
            {timeRangeOptions.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  timeRange === range
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {t(`risk.timeRanges.${range}`)}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("risk.noHistory")}
            </p>
          ) : (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="trendScoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="trendSmoothedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="timestamp"
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                    tickFormatter={(val: string) => {
                      const d = new Date(val);
                      return timeRange === "24h"
                        ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : d.toLocaleDateString([], { month: "short", day: "numeric" });
                    }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    labelFormatter={(val: string) => new Date(val).toLocaleString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#f97316"
                    fill="url(#trendScoreGradient)"
                    strokeWidth={2}
                    name="Score"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="smoothedScore"
                    stroke="#3b82f6"
                    fill="url(#trendSmoothedGradient)"
                    strokeWidth={2}
                    name={t("risk.smoothedScore")}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state */}
      {!isLoading && !score && !error && (
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
