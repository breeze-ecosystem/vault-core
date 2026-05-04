"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { fetchAlerts, acknowledgeAlert, resolveAlert, markAlertFalsePositive, type Alert } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { AlertTriangle, CheckCircle, XCircle, Bell, BellOff } from "lucide-react";
import { getAccessToken } from "@/lib/auth-client";
import { io, Socket } from "socket.io-client";

const severityVariant: Record<string, "destructive" | "warning" | "default" | "secondary"> = {
  CRITICAL: "destructive",
  HIGH: "warning",
  MEDIUM: "default",
  LOW: "secondary",
  INFO: "secondary",
};

const statusLabels: Record<string, string> = {
  OPEN: "Ouverte",
  ACKNOWLEDGED: "Prise en compte",
  RESOLVED: "Resolue",
  FALSE_POSITIVE: "Faux positif",
};

export default function AlertesPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const filters: any = {};
  if (severityFilter) filters.severity = severityFilter;
  if (statusFilter) filters.status = statusFilter;

  // WebSocket connection for real-time alerts
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const socket = io(`${API_URL}/ws/alerts`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on("connect", () => {
      setWsConnected(true);
    });

    socket.on("disconnect", () => {
      setWsConnected(false);
    });

    socket.on("alert", (alert: Alert) => {
      // Auto-refresh table when new alert arrives
      setRefreshKey((k) => k + 1);

      // Show toast notification
      if (alert.severity === "CRITICAL" || alert.severity === "HIGH") {
        toast(`Alerte ${alert.severity}: ${alert.title}`, "error");
      } else {
        toast(`Nouvelle alerte: ${alert.title}`, "success");
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  async function handleAction(id: string, action: "ack" | "resolve" | "fp") {
    try {
      if (action === "ack") await acknowledgeAlert(id);
      else if (action === "resolve") await resolveAlert(id);
      else await markAlertFalsePositive(id);
      toast(action === "ack" ? "Alerte prise en compte" : action === "resolve" ? "Alerte resolue" : "Marquee faux positif", "success");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <div>
      <PageHeader title="Alertes" description="Consultation et gestion des alertes du systeme" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Temps reel:</span>
          <Badge variant={wsConnected ? "success" : "destructive"} className="text-xs">
            {wsConnected ? (
              <><Bell className="mr-1 h-3 w-3" /> Connecte</>
            ) : (
              <><BellOff className="mr-1 h-3 w-3" /> Deconnecte</>
            )}
          </Badge>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex gap-1">
          <span className="self-center text-xs text-muted-foreground mr-1">Severite:</span>
          {["", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map((s) => (
            <Button key={s} variant={severityFilter === s ? "default" : "outline"} size="sm" onClick={() => setSeverityFilter(s)}>
              {s || "Toutes"}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          <span className="self-center text-xs text-muted-foreground mr-1">Statut:</span>
          {["", "OPEN", "ACKNOWLEDGED", "RESOLVED", "FALSE_POSITIVE"].map((s) => (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}>
              {s ? statusLabels[s] : "Tous"}
            </Button>
          ))}
        </div>
      </div>

      <DataTable
        key={refreshKey}
        columns={[
          { key: "severity", label: "Severite", render: (a: Alert) => (
            <Badge variant={severityVariant[a.severity]}>{a.severity}</Badge>
          )},
          { key: "title", label: "Titre", render: (a: Alert) => (
            <span className="font-medium">{a.title}</span>
          )},
          { key: "camera", label: "Camera", render: (a: Alert) => a.camera?.name ?? "—" },
          { key: "status", label: "Statut", render: (a: Alert) => (
            <Badge variant="outline">{statusLabels[a.status] ?? a.status}</Badge>
          )},
          { key: "createdAt", label: "Date", render: (a: Alert) => new Date(a.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) },
          { key: "actions", label: "Actions", render: (a: Alert) => (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              {a.status === "OPEN" && (
                <Button size="sm" variant="outline" onClick={() => handleAction(a.id, "ack")}>
                  <CheckCircle className="mr-1 h-3 w-3" /> Prendre en compte
                </Button>
              )}
              {(a.status === "OPEN" || a.status === "ACKNOWLEDGED") && (
                <Button size="sm" variant="outline" onClick={() => handleAction(a.id, "resolve")}>
                  <CheckCircle className="mr-1 h-3 w-3" /> Resoudre
                </Button>
              )}
              {a.status !== "FALSE_POSITIVE" && a.status !== "RESOLVED" && (
                <Button size="sm" variant="ghost" onClick={() => handleAction(a.id, "fp")}>
                  <XCircle className="mr-1 h-3 w-3" /> Faux positif
                </Button>
              )}
            </div>
          )},
        ]}
        fetchFn={fetchAlerts}
        filters={filters}
      />
    </div>
  );
}
