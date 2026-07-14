"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  fetchCameraHealth,
  fetchCameraHealthHistory,
  type CameraHealthDto,
} from "@/lib/api";
import { Video, Search, Wifi, WifiOff, AlertTriangle, History } from "lucide-react";

const statusBadge: Record<string, "success" | "destructive" | "warning" | "default"> = {
  ONLINE: "success",
  OFFLINE: "destructive",
  DEGRADED: "warning",
  MAINTENANCE: "default",
};

const statusLabels: Record<string, string> = {
  ONLINE: "En ligne",
  OFFLINE: "Hors ligne",
  DEGRADED: "Dégradé",
  MAINTENANCE: "Maintenance",
};

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `il y a ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return `il y a ${hours}h`;
}

interface HistoryModalProps {
  cameraId: string;
  cameraName: string;
  onClose: () => void;
}

function HistoryModal({ cameraId, cameraName, onClose }: HistoryModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchCameraHealthHistory(cameraId)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cameraId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Historique — {cameraName}</h2>
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
                <div className="flex items-center gap-3">
                  <Badge variant={statusBadge[entry.status?.toUpperCase()] ?? "default"}>
                    {statusLabels[entry.status?.toUpperCase()] ?? entry.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    FPS: {entry.fps_actual ?? "—"}/{entry.fps_expected ?? "—"}
                  </span>
                  {entry.latency_ms !== null && entry.latency_ms !== undefined && (
                    <span className="text-muted-foreground">
                      Latence: {entry.latency_ms}ms
                    </span>
                  )}
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

export default function CameraHealthPage() {
  const [cameras, setCameras] = useState<CameraHealthDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [historyCamera, setHistoryCamera] = useState<{ id: string; name: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchCameraHealth();
      setCameras(data);
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

  const filtered = cameras.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Santé des caméras"
        description="État en temps réel des caméras — battements de cœur, FPS et statut"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {["", "ONLINE", "OFFLINE", "DEGRADED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s ? statusLabels[s] : "Tous"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nom</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Site</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dernier battement</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Images/s</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Enregistrement</th>
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
                      Aucune caméra trouvée
                    </td>
                  </tr>
                ) : (
                  filtered.map((camera) => (
                    <tr key={camera.id} className="border-b border-border transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{camera.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{camera.siteName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadge[camera.status] ?? "default"}>
                          {camera.status === "ONLINE" ? (
                            <Wifi className="mr-1 h-3 w-3" />
                          ) : camera.status === "OFFLINE" ? (
                            <WifiOff className="mr-1 h-3 w-3" />
                          ) : (
                            <AlertTriangle className="mr-1 h-3 w-3" />
                          )}
                          {statusLabels[camera.status] ?? camera.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {relativeTime(camera.lastHeartbeat)}
                      </td>
                      <td className="px-4 py-3">
                        {camera.fps ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {camera.isRecording ? (
                          <Badge variant="success">Oui</Badge>
                        ) : (
                          <Badge variant="outline">Non</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setHistoryCamera({ id: camera.id, name: camera.name })}
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

      {historyCamera && (
        <HistoryModal
          cameraId={historyCamera.id}
          cameraName={historyCamera.name}
          onClose={() => setHistoryCamera(null)}
        />
      )}
    </div>
  );
}
