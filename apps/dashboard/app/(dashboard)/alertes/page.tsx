"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertFeed } from "@/components/alert-feed";
import { AlertSidePanel } from "@/components/alert-side-panel";
import { BulkActionBar } from "@/components/bulk-action-bar";
import { fetchAlerts, acknowledgeAlert, resolveAlert, markAlertFalsePositive, deleteAlert, type Alert } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Bell, BellOff, AlertTriangle } from "lucide-react";
import { getAccessToken } from "@/lib/auth-client";
import { io, Socket } from "socket.io-client";

const severityLabels: Record<string, string> = {
  CRITICAL: "Critiques",
  HIGH: "Élevée",
  MEDIUM: "Moyenne",
  LOW: "Faible",
  INFO: "Info",
};

const severityPills = [
  { value: "", label: "Toutes" },
  { value: "CRITICAL", label: "Critiques" },
  { value: "HIGH", label: "Élevée" },
  { value: "MEDIUM", label: "Moyenne" },
  { value: "LOW", label: "Basse" },
];

export default function AlertesPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = {};
      if (severityFilter) filters.severity = severityFilter;
      const res = await fetchAlerts(filters);
      setAlerts(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [severityFilter]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts, refreshKey]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://oversight-api.digitsoftafrica.com";
    const socket = io(`${API_URL}/ws/alerts`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on("connect", () => setWsConnected(true));
    socket.on("disconnect", () => setWsConnected(false));

    socket.on("alert", (alert: Alert) => {
      setAlerts((prev) => [alert, ...prev]);
      if (alert.severity === "CRITICAL" || alert.severity === "HIGH") {
        toast(`Alerte ${alert.severity}: ${alert.title}`, "error");
      } else {
        toast(`Nouvelle alerte: ${alert.title}`, "success");
      }
    });

    socket.on("alert_updated", (updated: Alert) => {
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  const handleAction = useCallback(async (id: string, action: "ack" | "resolve" | "fp") => {
    try {
      if (action === "ack") await acknowledgeAlert(id);
      else if (action === "resolve") await resolveAlert(id);
      else await markAlertFalsePositive(id);
      toast(
        action === "ack" ? "Alerte prise en compte" :
        action === "resolve" ? "Alerte résolue" : "Marquée comme faux positif",
        "success"
      );
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      toast(e.message, "error");
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Supprimer cette alerte définitivement ?")) return;
    try {
      await deleteAlert(id);
      toast("Alerte supprimée", "success");
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      toast(e.message, "error");
    }
  }, []);

  const handleAcknowledgeSelected = useCallback(async () => {
    setBulkProcessing(true);
    try {
      await Promise.all(Array.from(selectedAlerts).map((id) => acknowledgeAlert(id)));
      toast(`${selectedAlerts.size} alerte(s) prise(s) en compte`, "success");
      setAlerts((prev) => prev.filter((a) => !selectedAlerts.has(a.id)));
      setSelectedAlerts(new Set());
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedAlerts]);

  const handleResolveSelected = useCallback(async () => {
    setBulkProcessing(true);
    try {
      await Promise.all(Array.from(selectedAlerts).map((id) => resolveAlert(id)));
      toast(`${selectedAlerts.size} alerte(s) résolue(s)`, "success");
      setAlerts((prev) => prev.filter((a) => !selectedAlerts.has(a.id)));
      setSelectedAlerts(new Set());
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedAlerts]);

  const handleSelectAlert = useCallback((id: string) => {
    setSelectedAlertId((prev) => (prev === id ? null : id));
    setSelectedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredAlerts = alerts;

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || null;

  if (error && alerts.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-lg font-medium">Erreur de chargement</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadAlerts}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertes"
        description={`${alerts.length} alerte${alerts.length > 1 ? "s" : ""} active${alerts.length > 1 ? "s" : ""}`}
      />

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {severityPills.map((pill) => (
            <Button
              key={pill.value}
              variant={severityFilter === pill.value ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setSeverityFilter(pill.value)}
            >
              {pill.label}
            </Button>
          ))}
        </div>
        <Badge variant={wsConnected ? "success" : "destructive"} className="text-xs gap-1">
          {wsConnected ? (
            <><Bell className="h-3 w-3" /> Connecté</>
          ) : (
            <><BellOff className="h-3 w-3" /> Déconnecté</>
          )}
        </Badge>
      </div>

      {!wsConnected && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-2 text-sm text-warning">
          Connexion perdue — reconnexion...
        </div>
      )}

      <div className="relative flex gap-6">
        <div className="flex-1 min-w-0">
          <AlertFeed
            alerts={filteredAlerts}
            loading={loading}
            selectedId={selectedAlertId}
            onSelectAlert={handleSelectAlert}
            onAcknowledge={(id) => handleAction(id, "ack")}
          />
        </div>
      </div>

      <AlertSidePanel
        alert={selectedAlert}
        open={!!selectedAlertId}
        onClose={() => setSelectedAlertId(null)}
        onAcknowledge={(id) => { handleAction(id, "ack"); setSelectedAlertId(null); }}
        onResolve={(id) => { handleAction(id, "resolve"); setSelectedAlertId(null); }}
        onViewCamera={(id) => window.open(`/cameras/${id}`, "_blank")}
      />

      <BulkActionBar
        selectedCount={selectedAlerts.size}
        onAcknowledgeSelected={handleAcknowledgeSelected}
        onResolveSelected={handleResolveSelected}
        processing={bulkProcessing}
      />
    </div>
  );
}
