"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchPredictions,
  fetchPredictiveSummary,
  triggerPredictionCycle,
  type PredictionDto,
  type PredictiveSummaryDto,
} from "@/lib/api";
import {
  Activity,
  AlertTriangle,
  Camera,
  Radio,
  Cpu,
  TrendingDown,
  TrendingUp,
  Minus,
  Play,
  Loader2,
  RefreshCw,
} from "lucide-react";

const metricLabels: Record<string, string> = {
  battery_level: "Niveau de batterie",
  fps_ratio: "Ratio FPS",
  latency_ms: "Latence (ms)",
  failed_reads: "Lectures échouées",
};

const deviceTypeIcons: Record<string, React.ReactNode> = {
  camera: <Camera className="h-4 w-4" />,
  reader: <Radio className="h-4 w-4" />,
  controller: <Cpu className="h-4 w-4" />,
};

function hoursToFailureBadge(hours: number | null): React.ReactNode {
  if (hours === null) return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">OK</Badge>;
  if (hours <= 24) return <Badge variant="destructive">{hours}h</Badge>;
  if (hours <= 72) return <Badge variant="warning">{hours}h</Badge>;
  return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">{hours}h</Badge>;
}

function confidenceBadge(confidence: string): React.ReactNode {
  const map: Record<string, { variant: "success" | "warning" | "default"; label: string }> = {
    high: { variant: "success", label: "Haute" },
    medium: { variant: "warning", label: "Moyenne" },
    low: { variant: "default", label: "Faible" },
  };
  const c = map[confidence] ?? { variant: "default" as const, label: confidence };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function TrendIcon({ slope }: { slope: number }) {
  if (slope > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
  if (slope < 0) return <TrendingDown className="h-4 w-4 text-orange-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export default function PredictiveHealthPage() {
  const [predictions, setPredictions] = useState<PredictionDto[]>([]);
  const [summary, setSummary] = useState<PredictiveSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filterType, setFilterType] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [preds, summ] = await Promise.all([
        fetchPredictions(filterType ? { deviceType: filterType } : undefined),
        fetchPredictiveSummary(),
      ]);
      setPredictions(preds);
      setSummary(summ);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRunAnalysis() {
    setRunning(true);
    try {
      await triggerPredictionCycle();
      setTimeout(() => {
        loadData();
        setRunning(false);
      }, 2000);
    } catch {
      setRunning(false);
    }
  }

  const atRisk = predictions.filter(
    (p) => p.hoursToFailure !== null && p.hoursToFailure <= 72,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Maintenance prédictive" description="Analyse prédictive des défaillances d'équipements" />
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance prédictive"
        description="Analyse prédictive des défaillances d'équipements"
      />

      {/* Filter and Run button */}
      <div className="flex items-center gap-3">
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Tous les types</option>
          <option value="camera">Caméras</option>
          <option value="reader">Lecteurs</option>
          <option value="controller">Contrôleurs</option>
        </select>
        <Button onClick={handleRunAnalysis} disabled={running}>
          {running ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Exécuter l'analyse
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prédictions totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold">{summary?.totalPredictions ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Échecs prévus &lt; 72h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-3xl font-bold text-destructive">{summary?.criticalPredictions ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Caméras à risque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-warning" />
              <span className="text-3xl font-bold">{summary?.byDeviceType.camera ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lecteurs à risque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-warning" />
                <span className="text-3xl font-bold">{summary?.byDeviceType.reader ?? 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contrôleurs à risque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-warning" />
                <span className="text-3xl font-bold">{summary?.byDeviceType.controller ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* At-Risk Devices Section */}
      {atRisk.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Équipements à risque (&lt; 72h)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {atRisk.map((p) => (
              <Card key={`${p.deviceId}-${p.metric}`} className="border-destructive/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {deviceTypeIcons[p.deviceType]}
                      {p.deviceName ?? p.deviceId.substring(0, 8)}
                    </CardTitle>
                    {hoursToFailureBadge(p.hoursToFailure)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{metricLabels[p.metric] ?? p.metric}</span>
                      <span className="font-medium">{p.currentValue.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Confiance</span>
                      {confidenceBadge(p.confidence)}
                    </div>
                    {/* Degradation progress bar */}
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-destructive transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(5, ((p.failureThreshold - p.currentValue) / p.failureThreshold) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Seuil: {p.failureThreshold}</span>
                      <span>Actuel: {p.currentValue.toFixed(1)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Predictions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Toutes les prédictions</CardTitle>
        </CardHeader>
        <CardContent>
          {predictions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucune prédiction disponible. Les calculs sont effectués toutes les heures.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground py-2 px-2">Type</th>
                    <th className="text-left font-medium text-muted-foreground py-2 px-2">Équipement</th>
                    <th className="text-left font-medium text-muted-foreground py-2 px-2">Métrique</th>
                    <th className="text-right font-medium text-muted-foreground py-2 px-2">Valeur</th>
                    <th className="text-right font-medium text-muted-foreground py-2 px-2">Seuil</th>
                    <th className="text-center font-medium text-muted-foreground py-2 px-2">Tendance</th>
                    <th className="text-center font-medium text-muted-foreground py-2 px-2">Heures</th>
                    <th className="text-center font-medium text-muted-foreground py-2 px-2">Confiance</th>
                    <th className="text-center font-medium text-muted-foreground py-2 px-2">Alerté</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={`${p.deviceId}-${p.metric}-${p.time}`} className="border-b last:border-b-0 hover:bg-muted/50">
                      <td className="py-2 px-2">
                        <span className="flex items-center gap-1">
                          {deviceTypeIcons[p.deviceType]}
                          <span className="capitalize">{p.deviceType}</span>
                        </span>
                      </td>
                      <td className="py-2 px-2 font-medium">
                        {p.deviceName ?? p.deviceId.substring(0, 8)}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {metricLabels[p.metric] ?? p.metric}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {p.currentValue.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                        {p.failureThreshold}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <TrendIcon slope={p.slope} />
                      </td>
                      <td className="py-2 px-2 text-center">
                        {hoursToFailureBadge(p.hoursToFailure)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {confidenceBadge(p.confidence)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {p.triggeredAlert ? (
                          <Badge variant="destructive" className="text-xs">Oui</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
