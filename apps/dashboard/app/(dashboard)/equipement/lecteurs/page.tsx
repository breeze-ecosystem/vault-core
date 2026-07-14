"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  fetchReaderHealth,
  fetchReaderHealthHistory,
  type ReaderHealthDto,
} from "@/lib/api";
import { Radio, History } from "lucide-react";

const statusBadge: Record<string, "success" | "destructive" | "warning" | "default"> = {
  online: "success",
  offline: "destructive",
  degraded: "warning",
};

const statusLabels: Record<string, string> = {
  online: "En ligne",
  offline: "Hors ligne",
  degraded: "Dégradé",
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
  readerId: string;
  onClose: () => void;
}

function HistoryModal({ readerId, onClose }: HistoryModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchReaderHealthHistory(readerId)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [readerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Historique — Lecteur {readerId.substring(0, 8)}...</h2>
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
                  <Badge variant={statusBadge[entry.status?.toLowerCase()] ?? "default"}>
                    {statusLabels[entry.status?.toLowerCase()] ?? entry.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    Échecs: {entry.failed_reads ?? 0}
                  </span>
                  {entry.response_time_ms !== null && entry.response_time_ms !== undefined && (
                    <span className="text-muted-foreground">
                      {entry.response_time_ms}ms
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

export default function ReaderHealthPage() {
  const [readers, setReaders] = useState<ReaderHealthDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [historyReader, setHistoryReader] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchReaderHealth();
      setReaders(data);
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

  const filtered = readers.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Santé des lecteurs"
        description="État en temps réel des lecteurs d'accès — lectures échouées et temps de réponse"
      />

      {/* Status filter */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {["", "online", "offline", "degraded"].map((s) => (
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lecteur</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lectures échouées</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Temps de réponse</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dernière connexion</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Firmware</th>
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
                      Aucun lecteur trouvé
                    </td>
                  </tr>
                ) : (
                  filtered.map((reader) => (
                    <tr key={reader.reader_id} className="border-b border-border transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        <span className="font-mono text-xs">{reader.reader_id?.substring(0, 8)}...</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadge[reader.status?.toLowerCase()] ?? "default"}>
                          {statusLabels[reader.status?.toLowerCase()] ?? reader.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={reader.failed_reads && reader.failed_reads > 10 ? "text-destructive font-medium" : ""}>
                          {reader.failed_reads ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {reader.response_time_ms !== null && reader.response_time_ms !== undefined
                          ? `${reader.response_time_ms}ms`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {relativeTime(reader.last_connected)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {reader.firmware_version ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setHistoryReader(reader.reader_id)}
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

      {historyReader && (
        <HistoryModal
          readerId={historyReader}
          onClose={() => setHistoryReader(null)}
        />
      )}
    </div>
  );
}
