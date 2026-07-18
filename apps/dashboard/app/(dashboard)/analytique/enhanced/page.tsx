"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { PageHeader } from "@/components/page-header";
import { PageTransition, containerVariants } from "@/components/page-transition";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsKpiGrid } from "@/components/analytics-kpi-grid";
import { TrendChartCard } from "@/components/trend-chart-card";
import { ReportScheduleConfig } from "@/components/report-schedule-config";
import { ReportPreview } from "@/components/report-preview";
import {
  fetchBastionKpis,
  fetchBastionTrends,
  exportBastionData,
  bastionAdvancedSearch,
  generateReport,
  getReportsList,
  downloadReport,
  type AnalyticsTrendPoint,
} from "@/lib/api";
import type { BastionKpisDto } from "@repo/shared";
import {
  Download,
  Calendar,
  Filter,
  FileText,
  Search,
  AlertCircle,
  BarChart3,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type DataTab = "trends" | "search" | "export";
type PeriodPreset = "today" | "7d" | "30d" | "custom";

export default function EnhancedAnalyticsPage() {
  const [kpis, setKpis] = useState<BastionKpisDto | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);

  const [trendData, setTrendData] = useState<AnalyticsTrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<7 | 30>(7);

  const [activeTab, setActiveTab] = useState<DataTab>("trends");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("7d");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Report schedule state
  const [showScheduleConfig, setShowScheduleConfig] = useState(false);
  const [showPreviewId, setShowPreviewId] = useState<string | null>(null);

  // Filters
  const [siteFilter, setSiteFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");

  const loadKpis = useCallback(async () => {
    setKpiLoading(true);
    setKpiError(null);
    try {
      const data = await fetchBastionKpis();
      setKpis(data);
    } catch (err: any) {
      setKpiError(err.message || "Erreur de chargement");
    } finally {
      setKpiLoading(false);
    }
  }, []);

  const loadTrends = useCallback(async () => {
    setTrendLoading(true);
    setTrendError(null);
    try {
      const [incidents, alerts, entries] = await Promise.all([
        fetchBastionTrends("incidents", granularity).catch(() => []),
        fetchBastionTrends("alerts", granularity).catch(() => []),
        fetchBastionTrends("entries", granularity).catch(() => []),
      ]);
      setTrendData([...incidents, ...alerts, ...entries]);
    } catch (err: any) {
      setTrendError(err.message || "Erreur de chargement des tendances");
    } finally {
      setTrendLoading(false);
    }
  }, [granularity]);

  useEffect(() => {
    loadKpis();
  }, [loadKpis]);

  useEffect(() => {
    if (activeTab === "trends") {
      loadTrends();
    }
  }, [activeTab, loadTrends]);

  const handleExport = async (format: "csv" | "pdf") => {
    try {
      const blob = await exportBastionData(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-bastion-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(
        format === "csv"
          ? "Export CSV téléchargé"
          : "Export PDF téléchargé",
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'export");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const result = await bastionAdvancedSearch({
        personName: searchQuery,
        siteId: siteFilter !== "all" ? siteFilter : undefined,
        eventType: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
      });
      setSearchResults(result.data);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la recherche");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSaveSchedule = async (config: any) => {
    await generateReport(config.type);
    setShowScheduleConfig(false);
  };

  const handleDownloadReport = async () => {
    if (showPreviewId) {
      await downloadReport(showPreviewId);
    }
  };

  const periodPresets: { key: PeriodPreset; label: string }[] = [
    { key: "today", label: "Aujourd'hui" },
    { key: "7d", label: "7 jours" },
    { key: "30d", label: "30 jours" },
    { key: "custom", label: "Personnalisé" },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Analytique"
          description="Tableau de bord des indicateurs BASTION et tendances"
        />

        {/* Filter Bar */}
        <GlassCard className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Filtres :
              </span>
            </div>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="all">Tous les sites</option>
              <option value="site-1">Site principal</option>
            </select>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="all">Tous les types</option>
              <option value="incident">Incident</option>
              <option value="alert">Alerte</option>
              <option value="entry">Entrée</option>
            </select>
            <div className="ml-auto flex gap-1 rounded-lg border border-border bg-card p-0.5">
              {periodPresets.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => setPeriodPreset(preset.key)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    periodPreset === preset.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* KPI Grid */}
        <AnalyticsKpiGrid
          kpis={kpis}
          loading={kpiLoading}
          error={kpiError}
          onRetry={loadKpis}
        />

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <nav className="-mb-px flex gap-6">
            {([
              { key: "trends", label: "Tendances" },
              { key: "search", label: "Recherche" },
              { key: "export", label: "Export" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {tab.key === "trends" && <BarChart3 className="h-4 w-4" />}
                {tab.key === "search" && <Search className="h-4 w-4" />}
                {tab.key === "export" && <FileDown className="h-4 w-4" />}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Trends Tab */}
          {activeTab === "trends" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <TrendChartCard
                metric="incidents"
                data={trendData.filter((d) => d.metric === "incidents")}
                granularity={granularity}
                onGranularityChange={setGranularity}
                loading={trendLoading}
                error={trendError}
                onRetry={loadTrends}
              />
              <TrendChartCard
                metric="alerts"
                data={trendData.filter((d) => d.metric === "alerts")}
                granularity={granularity}
                onGranularityChange={setGranularity}
                loading={trendLoading}
                error={trendError}
                onRetry={loadTrends}
              />
              <TrendChartCard
                metric="entries"
                data={trendData.filter((d) => d.metric === "entries")}
                granularity={granularity}
                onGranularityChange={setGranularity}
                loading={trendLoading}
                error={trendError}
                onRetry={loadTrends}
              />
            </div>
          )}

          {/* Search Tab */}
          {activeTab === "search" && (
            <GlassCard className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, événement..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <Button onClick={handleSearch} disabled={searchLoading}>
                  {searchLoading ? "Recherche..." : "Rechercher"}
                </Button>
              </div>

              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {result.eventType || result.type || "Événement"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.description || result.detail || ""}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {result.date || result.time
                          ? new Date(
                              result.date || result.time,
                            ).toLocaleDateString("fr-FR")
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : searchQuery && !searchLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Search className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Aucun résultat trouvé
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <Search className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Recherche d&apos;événements
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recherchez par nom de personne, type d&apos;événement ou
                    période
                  </p>
                </div>
              )}
            </GlassCard>
          )}

          {/* Export Tab */}
          {activeTab === "export" && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Export buttons */}
              <GlassCard className="p-5">
                <h3 className="mb-4 text-sm font-semibold">
                  Exporter les données
                </h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleExport("csv")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exporter en CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleExport("pdf")}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Exporter en PDF
                  </Button>
                </div>
              </GlassCard>

              {/* Schedule and preview */}
              <div className="space-y-4">
                {showScheduleConfig ? (
                  <ReportScheduleConfig
                    schedule={null}
                    onSave={handleSaveSchedule}
                  />
                ) : (
                  <GlassCard className="p-5">
                    <h3 className="mb-4 text-sm font-semibold">
                      Rapports planifiés
                    </h3>
                    <p className="mb-4 text-xs text-muted-foreground">
                      Configurez l&apos;envoi automatique de rapports
                      hebdomadaires ou mensuels.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowScheduleConfig(true)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Planifier un rapport
                    </Button>
                  </GlassCard>
                )}

                {showPreviewId && (
                  <ReportPreview
                    reportId={showPreviewId}
                    onDownload={handleDownloadReport}
                    onClose={() => setShowPreviewId(null)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
