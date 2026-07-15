"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  fetchControllerHealth,
  fetchControllerHealthHistory,
  type ControllerHealthDto,
} from "@/lib/api";
import { Cpu, Battery, History } from "lucide-react";

function batteryIcon(level: number | null | undefined) {
  if (level === null || level === undefined) return "—";
  if (level > 50) return "🟢";
  if (level > 20) return "🟡";
  return "🔴";
}

function batteryColor(level: number | null | undefined): string {
  if (level === null || level === undefined) return "text-muted-foreground";
  if (level > 50) return "text-success";
  if (level > 20) return "text-warning";
  return "text-destructive";
}

const stabilityBadge: Record<string, "success" | "destructive" | "warning"> = {
  stable: "success",
  unstable: "destructive",
  disconnected: "destructive",
};

const stabilityLabels: Record<string, string> = {
  stable: "Stable",
  unstable: "Instable",
  disconnected: "Déconnecté",
};

interface HistoryModalProps {
  controllerId: string;
  onClose: () => void;
}

function HistoryModal({ controllerId, onClose }: HistoryModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchControllerHealthHistory(controllerId)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [controllerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Historique — Contrôleur {controllerId.substring(0, 8)}...</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée d'historique disponible</p>
        ) : (
          <div className="space-y-2">
            {history.map((entry: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex items-center gap-4">
                  <span className={batteryColor(entry.battery_level)}>
                    <Battery className="mr-1 inline h-4 w-4" />
                    {entry.battery_level !== null && entry.battery_level !== undefined
                      ? `${entry.battery_level.toFixed(0)}%`
                      : "—"}
                  </span>
                        <Badge variant={stabilityBadge[entry.connection_stability?.toLowerCase() ?? ""] ?? "default"}>
                          {stabilityLabels[entry.connection_stability?.toLowerCase() ?? ""] ?? entry.connection_stability}
                  </Badge>
                  <span className="text-muted-foreground">
                    CPU: {entry.cpu_load !== null && entry.cpu_load !== undefined ? `${entry.cpu_load.toFixed(0)}%` : "—"}
                  </span>
                  <span className="text-muted-foreground">
                    RAM: {entry.memory_usage !== null && entry.memory_usage !== undefined ? `${entry.memory_usage.toFixed(0)}%` : "—"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.time).toLocaleString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ControllerHealthPage() {
  const [controllers, setControllers] = useState<ControllerHealthDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBattery, setFilterBattery] = useState<string>("");
  const [historyController, setHistoryController] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchControllerHealth();
      setControllers(data);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filtered = controllers.filter((c) => {
    if (filterBattery === "low") return c.battery_level !== null && c.battery_level !== undefined && c.battery_level < 20;
    if (filterBattery === "medium") return c.battery_level !== null && c.battery_level !== undefined && c.battery_level >= 20 && c.battery_level <= 50;
    if (filterBattery === "high") return c.battery_level !== null && c.battery_level !== undefined && c.battery_level > 50;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Santé des contrôleurs"
        description="État en temps réel des contrôleurs de porte — batterie, stabilité, charge système"
      />

      {/* Battery filter */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {[
          { value: "", label: "Tous" },
          { value: "high", label: "Batterie > 50%" },
          { value: "medium", label: "Batterie 20-50%" },
          { value: "low", label: "Batterie < 20%" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterBattery(f.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filterBattery === f.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contrôleur</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Batterie</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stabilité</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Firmware</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Charge CPU</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mémoire</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Chargement...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Aucun contrôleur trouvé
                    </td>
                  </tr>
                ) : (
                  filtered.map((ctrl) => (
                    <tr key={ctrl.controller_id} className="border-b border-border transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        <span className="font-mono text-xs">{ctrl.controller_id?.substring(0, 8)}...</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 font-medium ${batteryColor(ctrl.battery_level)}`}>
                          <Battery className="h-4 w-4" />
                          {ctrl.battery_level !== null && ctrl.battery_level !== undefined
                            ? `${ctrl.battery_level.toFixed(0)}%`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={stabilityBadge[ctrl.connection_stability?.toLowerCase() ?? ""] ?? "default"}>
                          {stabilityLabels[ctrl.connection_stability?.toLowerCase() ?? ""] ?? ctrl.connection_stability ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {ctrl.firmware_version ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${
                                ctrl.cpu_load !== null && ctrl.cpu_load !== undefined && ctrl.cpu_load > 80
                                  ? "bg-destructive"
                                  : ctrl.cpu_load !== null && ctrl.cpu_load !== undefined && ctrl.cpu_load > 50
                                  ? "bg-warning"
                                  : "bg-success"
                              }`}
                              style={{ width: `${Math.min(ctrl.cpu_load ?? 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {ctrl.cpu_load !== null && ctrl.cpu_load !== undefined ? `${ctrl.cpu_load.toFixed(0)}%` : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${
                                ctrl.memory_usage !== null && ctrl.memory_usage !== undefined && ctrl.memory_usage > 80
                                  ? "bg-destructive"
                                  : ctrl.memory_usage !== null && ctrl.memory_usage !== undefined && ctrl.memory_usage > 50
                                  ? "bg-warning"
                                  : "bg-success"
                              }`}
                              style={{ width: `${Math.min(ctrl.memory_usage ?? 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {ctrl.memory_usage !== null && ctrl.memory_usage !== undefined ? `${ctrl.memory_usage.toFixed(0)}%` : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setHistoryController(ctrl.controller_id)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <History className="h-3 w-3" />
                          Historique
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {historyController && (
        <HistoryModal
          controllerId={historyController}
          onClose={() => setHistoryController(null)}
        />
      )}
    </div>
  );
}
