"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/use-auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DoorOpen,
  AlertTriangle,
  Info,
  Activity,
  Webhook,
  Bot,
  Bell,
  X,
  Filter,
} from "lucide-react";

interface FeedEvent {
  id: string;
  type: "door" | "alert" | "incident" | "webhook" | "ai";
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  time: Date;
  source: string;
}

interface CommandCenterFeedProps {
  onNewEventCount?: (count: number) => void;
  className?: string;
}

const MAX_EVENTS = 100;

const severityConfig: Record<
  string,
  { border: string; icon: string; bg: string }
> = {
  critical: { border: "border-l-red-500", icon: "text-red-500", bg: "bg-red-500/5" },
  high: { border: "border-l-orange-500", icon: "text-orange-500", bg: "bg-orange-500/5" },
  medium: { border: "border-l-cyan-500", icon: "text-cyan-500", bg: "bg-cyan-500/5" },
  low: { border: "border-l-slate-400", icon: "text-slate-400", bg: "bg-slate-400/5" },
  info: { border: "border-l-blue-400", icon: "text-blue-400", bg: "bg-blue-400/5" },
};

const typeIcons: Record<string, React.ReactNode> = {
  door: <DoorOpen className="h-3.5 w-3.5" />,
  alert: <AlertTriangle className="h-3.5 w-3.5" />,
  incident: <Bell className="h-3.5 w-3.5" />,
  webhook: <Webhook className="h-3.5 w-3.5" />,
  ai: <Bot className="h-3.5 w-3.5" />,
};

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "à l'instant";
  if (seconds < 60) return `il y a ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `${hours}h`;
}

const FILTER_OPTIONS: { key: string; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "door", label: "Portes" },
  { key: "alert", label: "Alertes" },
  { key: "incident", label: "Incidents" },
  { key: "webhook", label: "Webhooks" },
  { key: "ai", label: "IA" },
];

export function CommandCenterFeed({
  onNewEventCount,
  className = "",
}: CommandCenterFeedProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const socketRef = useRef<Socket | null>(null);
  const [newEventCount, setNewEventCount] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);

  const connect = useCallback(() => {
    const userOrgId = (user as any)?.orgId;
    if (!userOrgId) return;

    const token = /* Try to get the access token */
      typeof window !== "undefined"
        ? sessionStorage.getItem("accessToken")
        : null;

    const socket = io(`${process.env.NEXT_PUBLIC_API_URL || ""}`, {
      path: "/ws/socket.io",
      auth: { token, orgId: userOrgId },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("subscribe:site", { orgId: userOrgId });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    // Door events
    socket.on("state-update", (payload: any) => {
      addEvent({
        id: `door-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "door",
        severity: payload.state === "forced" ? "critical" : "info",
        title: payload.doorName || "État de porte",
        description:
          payload.state === "open"
            ? "Porte ouverte"
            : payload.state === "closed"
              ? "Porte fermée"
              : payload.state === "locked"
                ? "Porte verrouillée"
                : payload.state === "forced"
                  ? "Porte forcée !"
                  : `Changement d'état: ${payload.state}`,
        time: new Date(),
        source: payload.doorName || "Porte inconnue",
      });
    });

    // Webhook delivery events
    socket.on("webhook:delivery", (payload: any) => {
      addEvent({
        id: `webhook-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "webhook",
        severity: payload.success ? "info" : "high",
        title: payload.success ? "Livraison webhook" : "Échec webhook",
        description: payload.success
          ? `Webhook ${payload.eventType} livré (${payload.statusCode})`
          : `Webhook ${payload.eventType} échoué: ${payload.error || "Erreur inconnue"}`,
        time: new Date(),
        source: payload.eventType || "Webhook",
      });
    });

    // Alert events
    socket.on("alert:new", (payload: any) => {
      addEvent({
        id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "alert",
        severity: payload.severity?.toLowerCase() || "medium",
        title: payload.title || "Nouvelle alerte",
        description: payload.description || "",
        time: new Date(),
        source: payload.source || `Caméra ${payload.cameraId?.substring(0, 8) || "inconnue"}`,
      });
    });

    // Incident events
    socket.on("incident:status", (payload: any) => {
      addEvent({
        id: `incident-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "incident",
        severity: payload.severity?.toLowerCase() || "medium",
        title: payload.title || "Mise à jour incident",
        description: payload.status
          ? `Statut: ${payload.status}`
          : "Mise à jour d'incident",
        time: new Date(),
        source: payload.zoneName || payload.id?.substring(0, 8) || "Incident",
      });
    });

    // AI agent events
    socket.on("ai:agent-response", (payload: any) => {
      addEvent({
        id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "ai",
        severity: "info",
        title: "Réponse IA",
        description:
          payload.agentName
            ? `${payload.agentName}: ${(payload.response || "").substring(0, 120)}`
            : (payload.response || "").substring(0, 120),
        time: new Date(),
        source: payload.agentName || "Agent IA",
      });
    });

    socketRef.current = socket;
  }, [user]);

  const addEvent = useCallback((event: FeedEvent) => {
    setEvents((prev) => {
      const updated = [event, ...prev].slice(0, MAX_EVENTS);
      return updated;
    });
    setNewEventCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  useEffect(() => {
    onNewEventCount?.(newEventCount);
  }, [newEventCount, onNewEventCount]);

  const filteredEvents = events.filter((e) => {
    if (filterType !== "all" && e.type !== filterType) return false;
    if (filterSeverity !== "all" && e.severity !== filterSeverity) return false;
    return true;
  });

  const clearEvents = () => {
    setEvents([]);
    setNewEventCount(0);
  };

  return (
    <div
      className={`flex flex-col h-full bg-card border-r border-border ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">Flux temps réel</span>
          {!connected && (
            <span className="text-[10px] text-destructive font-medium">
              Déconnecté
            </span>
          )}
          {connected && (
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {newEventCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              +{newEventCount}
            </span>
          )}
          <button
            onClick={clearEvents}
            className="p-1 rounded hover:bg-accent transition-colors"
            title="Effacer"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/50">
        <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
        <div className="flex gap-1 overflow-x-auto">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilterType(opt.key)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap ${
                filterType === opt.key
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Offline banner */}
      {!connected && (
        <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-destructive/10 border-b border-destructive/20">
          <Info className="h-3 w-3 text-destructive" />
          <span className="text-[10px] text-destructive font-medium">
            Déconnecté — tentative de reconnexion...
          </span>
        </div>
      )}

      {/* Event list */}
      <ScrollArea className="flex-1">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              {events.length === 0
                ? "Aucun événement — en attente de données..."
                : "Aucun événement correspondant aux filtres"}
            </p>
          </div>
        ) : (
          <div ref={feedRef} className="flex flex-col">
            {filteredEvents.map((event) => {
              const sevConf = severityConfig[event.severity] ?? severityConfig.info;
              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-2.5 px-3 py-2 border-l-2 ${sevConf!.border} ${sevConf!.bg} hover:bg-accent/30 transition-colors border-b border-border/30 last:border-b-0`}
                >
                  {/* Type icon */}
                  <div className={`mt-0.5 shrink-0 ${sevConf!.icon}`}>
                    {typeIcons[event.type] || <Activity className="h-3.5 w-3.5" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground truncate">
                        {event.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {relativeTime(event.time)}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[9px] text-muted-foreground bg-muted/50 px-1 py-0.5 rounded truncate max-w-[130px]">
                        {event.source}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border/50">
        <p className="text-[9px] text-muted-foreground">
          {events.length}/{MAX_EVENTS} événements
          {filterType !== "all" && ` · filtrés: ${filterType}`}
        </p>
      </div>
    </div>
  );
}
