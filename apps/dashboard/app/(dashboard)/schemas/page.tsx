"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/use-auth";
import { useTranslation } from "@/lib/i18n/context";
import {
  fetchDetectedPatterns,
  fetchPatternDefinitions,
  resolvePattern,
  triggerPatternDetection,
  type DetectedPatternDto,
  type PatternDefinition,
} from "@/lib/api";
import {
  DoorOpen,
  Video,
  Radio,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCcw,
  Loader2,
  Repeat,
} from "lucide-react";

const severityBadgeVariant: Record<string, "destructive" | "warning" | "default" | "secondary"> = {
  CRITICAL: "destructive",
  HIGH: "warning",
  MEDIUM: "default",
  LOW: "secondary",
};

const deviceTypeIconMap: Record<string, typeof DoorOpen> = {
  door: DoorOpen,
  reader: Radio,
  camera: Video,
  controller: Radio,
};

type DeviceTab = "all" | "door" | "reader" | "camera";

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

export default function PatternsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<DetectedPatternDto[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DeviceTab>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedPattern, setSelectedPattern] = useState<DetectedPatternDto | null>(null);
  const [detectMsg, setDetectMsg] = useState<string | null>(null);

  const loadPatterns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setDetectMsg(null);

    try {
      const params: Record<string, string> = {};
      if (activeTab !== "all") params.deviceType = activeTab;
      if (severityFilter) params.severity = severityFilter;
      if (statusFilter === "active") params.resolved = "false";
      else if (statusFilter === "resolved") params.resolved = "true";

      const result = await fetchDetectedPatterns(
        Object.keys(params).length > 0 ? params : undefined,
      ).catch(() => ({ data: [], total: 0 }));

      setPatterns(result.data);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, severityFilter, statusFilter]);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  const handleTriggerDetection = async () => {
    setIsDetecting(true);
    setDetectMsg(null);
    try {
      await triggerPatternDetection();
      setDetectMsg(t("patterns.triggerSuccess"));
      setTimeout(() => loadPatterns(), 2000);
    } catch {
      setError("Échec du déclenchement de la détection");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleResolve = async (pattern: DetectedPatternDto) => {
    try {
      await resolvePattern(pattern.patternId, pattern.deviceId);
      setPatterns((prev) =>
        prev.map((p) =>
          p.id === pattern.id ? { ...p, resolved: true, resolvedAt: new Date().toISOString() } : p,
        ),
      );
      setSelectedPattern(null);
    } catch {
      setError("Échec de la résolution du schéma");
    }
  };

  const summaryCards = {
    active: patterns.filter((p) => !p.resolved).length,
    doors: patterns.filter((p) => p.deviceType === "door").length,
    readers: patterns.filter((p) => p.deviceType === "reader").length,
    cameras: patterns.filter((p) => p.deviceType === "camera").length,
  };

  const deviceTabs: { id: DeviceTab; label: string }[] = [
    { id: "all", label: t("patterns.filters.all") },
    { id: "door", label: t("patterns.filters.doors") },
    { id: "reader", label: t("patterns.filters.readers") },
    { id: "camera", label: t("patterns.filters.cameras") },
  ];

  if (isLoading && patterns.length === 0) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("patterns.title")}
        description={t("patterns.title")}
        action={{
          label: t("patterns.detectNow"),
          icon: isDetecting ? Loader2 : RotateCw,
          onClick: handleTriggerDetection,
        }}
      />

      {/* Success message */}
      {detectMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="font-medium">{detectMsg}</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="font-medium">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("patterns.summary.active")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryCards.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("patterns.summary.doors")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-bold">
              <DoorOpen className="h-5 w-5 text-muted-foreground" />
              {summaryCards.doors}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("patterns.summary.readers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Radio className="h-5 w-5 text-muted-foreground" />
              {summaryCards.readers}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("patterns.summary.cameras")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Video className="h-5 w-5 text-muted-foreground" />
              {summaryCards.cameras}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device Type Tabs & Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {deviceTabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          <select
            className="rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="">Sévérité</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
          <select
            className="rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Statut</option>
            <option value="active">{t("patterns.filters.active")}</option>
            <option value="resolved">{t("patterns.filters.resolved")}</option>
          </select>
        </div>
      </div>

      {/* Patterns Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("patterns.title")} ({total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {patterns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Repeat className="mb-2 h-12 w-12 text-muted-foreground/50" />
              <p className="text-lg font-medium text-muted-foreground">
                {t("patterns.noPatterns")}
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleTriggerDetection} disabled={isDetecting}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                {t("patterns.detectNow")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("patterns.table.time")}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("patterns.table.patternName")}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("patterns.table.device")}</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">{t("patterns.table.occurrences")}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("patterns.table.severity")}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("patterns.table.status")}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("patterns.table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {patterns.map((pattern) => {
                    const DeviceIcon = deviceTypeIconMap[pattern.deviceType as keyof typeof deviceTypeIconMap] || DoorOpen;
                    return (
                      <tr
                        key={pattern.id}
                        className="border-b border-border transition-colors hover:bg-muted/30 cursor-pointer"
                        onClick={() => setSelectedPattern(selectedPattern?.id === pattern.id ? null : pattern)}
                      >
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(pattern.time).toLocaleString("fr-FR", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {pattern.patternName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                          {pattern.deviceId.substring(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">
                          {pattern.occurrenceCount}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={severityBadgeVariant[pattern.severity] || "default"}>
                            {pattern.severity}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {pattern.resolved ? (
                            <span className="flex items-center gap-1 text-sm text-green-500">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t("patterns.status.resolved")}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-sm text-red-500">
                              <span className="h-2 w-2 rounded-full bg-red-500" />
                              {t("patterns.status.active")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!pattern.resolved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleResolve(pattern); }}
                            >
                              {t("patterns.resolve")}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pattern Detail Section (shown below table when a row is clicked) */}
      {selectedPattern && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t("patterns.details")}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPattern(null)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t("patterns.table.patternName")}</p>
                <p className="font-medium">{selectedPattern.patternName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("patterns.table.severity")}</p>
                <Badge variant={severityBadgeVariant[selectedPattern.severity] || "default"}>
                  {selectedPattern.severity}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("patterns.table.device")}</p>
                <p className="font-mono text-sm">
                  {selectedPattern.deviceType} — {selectedPattern.deviceId.substring(0, 8)}...
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("patterns.table.occurrences")}</p>
                <p className="font-semibold">{selectedPattern.occurrenceCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("patterns.table.time")}</p>
                <p className="text-sm">{new Date(selectedPattern.time).toLocaleString("fr-FR")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("patterns.table.status")}</p>
                {selectedPattern.resolved ? (
                  <span className="flex items-center gap-1 text-sm text-green-500">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("patterns.status.resolved")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-red-500">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    {t("patterns.status.active")}
                  </span>
                )}
              </div>
            </div>
            {!selectedPattern.resolved && (
              <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" onClick={() => setSelectedPattern(null)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={() => handleResolve(selectedPattern)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t("patterns.resolve")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
