"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  fetchTimeline,
  fetchDoors,
  fetchCredentials,
  fetchZones,
  searchTimeline,
  searchEvents,
  type TimelineEntryDto,
  type DoorDto,
  type CredentialDto,
  type ZoneDto,
  type Camera,
  type VisionEventDto,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { TimelineFilterBar, type TimelineFilters } from "@/components/timeline-filter-bar";
import { ClipExportButton } from "@/components/clip-export-button";
import {
  Clock,
  CheckCircle,
  XCircle,
  DoorOpen,
  AlertTriangle,
  Search,
  X,
  Video,
  ChevronUp,
  Eye,
  ArrowLeft,
  Filter,
  Camera as CameraIcon,
  AlertCircle,
  UserCheck,
  Activity,
} from "lucide-react";

const WS_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "il y a " + seconds + "s";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return "il y a " + minutes + " min";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return "il y a " + hours + "h";
  const days = Math.floor(hours / 24);
  return "il y a " + days + "j";
}

function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChronologiePage() {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const [events, setEvents] = useState<TimelineEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEntryDto | null>(null);
  const [searchMode, setSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<TimelineEntryDto[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterCredential, setFilterCredential] = useState("");
  const [filterDoor, setFilterDoor] = useState("");
  const [filterZone, setFilterZone] = useState("");
  const [filterDecision, setFilterDecision] = useState("");
  const [doors, setDoors] = useState<DoorDto[]>([]);
  const [credentials, setCredentials] = useState<CredentialDto[]>([]);
  const [zones, setZones] = useState<ZoneDto[]>([]);
  const [newEventCount, setNewEventCount] = useState(0);

  // VISION event timeline state
  const [visionEvents, setVisionEvents] = useState<VisionEventDto[]>([]);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionTotal, setVisionTotal] = useState(0);
  const [visionPage, setVisionPage] = useState(1);
  const [visionCameraOptions, setVisionCameraOptions] = useState<{ id: string; name: string }[]>([]);
  const [selectedVisionEvent, setSelectedVisionEvent] = useState<VisionEventDto | null>(null);
  const [showVisionTimeline, setShowVisionTimeline] = useState(false);

  const isScrolledUpRef = useRef(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const loadTimeline = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const result = await fetchTimeline(orgId, { limit: 100 });
      setEvents(result.data || []);
    } catch (err: any) {
      setError(err.message || "Echec du chargement");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const loadReferenceData = useCallback(async () => {
    try {
      const [doorsData, credentialsData, zonesData] = await Promise.all([
        fetchDoors(),
        fetchCredentials({ limit: 200 }),
        fetchZones(),
      ]);
      setDoors(doorsData || []);
      setCredentials(credentialsData?.data || []);
      setZones(zonesData || []);
    } catch { /* optional */ }
  }, []);

  useEffect(() => {
    const socket = io(WS_URL + "/ws/access", {
      auth: { token: sessionStorage.getItem("accessToken") ?? undefined },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setSocketConnected(true);
      if (orgId) socket.emit("subscribe:site", orgId);
    });
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("access.granted", (payload: any) => {
      addLiveEvent({
        eventId: payload.eventId || "live-" + Date.now(),
        eventType: "access",
        timestamp: payload.timestamp || new Date().toISOString(),
        doorId: payload.doorId,
        summary: "Acces accorde",
        detail: "Justificatif #" + (payload.credentialId?.slice(0, 8) || "?"),
        metadata: payload,
      });
    });

    socket.on("access.denied", (payload: any) => {
      addLiveEvent({
        eventId: payload.eventId || "live-" + Date.now(),
        eventType: "access",
        timestamp: payload.timestamp || new Date().toISOString(),
        doorId: payload.doorId,
        summary: "Acces refuse",
        detail: payload.reason || "Refuse",
        metadata: payload,
      });
    });

    socket.on("door.state-changed", (payload: any) => {
      addLiveEvent({
        eventId: payload.eventId || "live-" + Date.now(),
        eventType: "door",
        timestamp: payload.timestamp || new Date().toISOString(),
        doorId: payload.doorId,
        summary: "Etat porte: " + payload.newState,
        detail: (payload.previousState || "?") + " -> " + payload.newState,
        metadata: payload,
      });
    });

    socket.on("correlation.ready", (payload: any) => {
      const updater = (prev: TimelineEntryDto[]) =>
        prev.map((e) =>
          e.doorId === payload.doorId &&
          Math.abs(new Date(e.timestamp).getTime() - new Date(payload.timestamp).getTime()) < 5000
            ? { ...e, videoThumbnailUrl: payload.thumbnailUrl, snapshotUrl: payload.snapshotUrl }
            : e
        );
      setEvents(updater);
      setSearchResults(updater);
    });

    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  function addLiveEvent(entry: TimelineEntryDto) {
    if (isScrolledUpRef.current) {
      setNewEventCount((c) => c + 1);
    } else {
      setEvents((prev) => [entry, ...prev].slice(0, 200));
    }
  }

  function handleScroll() {
    const container = timelineRef.current;
    if (!container) return;
    const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
    isScrolledUpRef.current = !atBottom;
    if (atBottom) setNewEventCount(0);
  }

  function scrollToTop() {
    timelineRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    isScrolledUpRef.current = false;
    setNewEventCount(0);
  }

  async function executeSearch() {
    if (!orgId) return;
    setSearchLoading(true);
    try {
      const result = await searchTimeline({
        organizationId: orgId,
        from: filterFrom || undefined,
        to: filterTo || undefined,
        credentialId: filterCredential || undefined,
        doorId: filterDoor || undefined,
        zoneId: filterZone || undefined,
        decision: (filterDecision === "granted" || filterDecision === "denied") ? (filterDecision as "granted" | "denied") : undefined,
        page: 1,
        limit: 50,
      });
      setSearchResults(result.data || []);
      setSearchTotal(result.total);
      setSearchPage(1);
      setSearchMode(true);
    } catch (err: any) {
      toast(err.message || "Echec de la recherche", "error");
    } finally {
      setSearchLoading(false);
    }
  }

  async function loadMoreSearchResults() {
    if (!orgId) return;
    const nextPage = searchPage + 1;
    try {
      const result = await searchTimeline({
        organizationId: orgId,
        from: filterFrom || undefined,
        to: filterTo || undefined,
        credentialId: filterCredential || undefined,
        doorId: filterDoor || undefined,
        zoneId: filterZone || undefined,
        decision: (filterDecision === "granted" || filterDecision === "denied") ? (filterDecision as "granted" | "denied") : undefined,
        page: nextPage,
        limit: 50,
      });
      setSearchResults((prev) => [...prev, ...(result.data || [])]);
      setSearchPage(nextPage);
    } catch { /* ignore */ }
  }

  function clearSearch() {
    setSearchMode(false);
    setSearchResults([]);
    setSearchTotal(0);
    setSearchPage(1);
    setFilterFrom("");
    setFilterTo("");
    setFilterCredential("");
    setFilterDoor("");
    setFilterZone("");
    setFilterDecision("");
    setShowFilters(false);
  }

  // Vision timeline filter handler
  const handleVisionFilter = useCallback(async (filters: TimelineFilters) => {
    if (!orgId) return;
    setVisionLoading(true);
    try {
      const dateFrom =
        filters.dateRange === "today"
          ? new Date().toISOString().split("T")[0]
          : filters.dateRange === "yesterday"
          ? new Date(Date.now() - 86400000).toISOString().split("T")[0]
          : filters.customFrom;
      const dateTo =
        filters.dateRange === "custom" ? filters.customTo : new Date().toISOString().split("T")[0];
      const eventType = filters.eventTypes.includes("all") ? undefined : filters.eventTypes.join(",");

      const result = await searchEvents({
        organizationId: orgId,
        from: dateFrom,
        to: dateTo,
        eventType,
        cameraId: filters.cameraId || undefined,
        page: 1,
        limit: 50,
      });
      setVisionEvents(result.data || []);
      setVisionTotal(result.total);
      setVisionPage(1);
    } catch (err: any) {
      toast(err.message || "Erreur de recherche", "error");
    } finally {
      setVisionLoading(false);
    }
  }, [orgId]);

  // Load cameras for the vision filter dropdown
  const loadVisionCameras = useCallback(async () => {
    try {
      const { fetchCameras } = await import("@/lib/api");
      const result = await fetchCameras({ limit: 100 });
      setVisionCameraOptions((result.data || []).map((c: Camera) => ({ id: c.id, name: c.name })));
    } catch {
      // Camera fetch is optional
    }
  }, []);

  useEffect(() => {
    loadTimeline();
    loadReferenceData();
    loadVisionCameras();
  }, [loadTimeline, loadReferenceData, loadVisionCameras]);

  function dotClass(e: TimelineEntryDto): string {
    if (e.eventType === "access") return e.summary?.includes("accorde") ? "bg-green-500" : "bg-red-500";
    const s = e.summary || "";
    if (s.includes("forcee") || s.includes("Forcee") || s.includes("forced")) return "bg-orange-500";
    return "bg-blue-500";
  }

  function dotIcon(e: TimelineEntryDto) {
    if (e.eventType === "access") {
      return e.summary?.includes("accorde")
        ? <CheckCircle className="h-3.5 w-3.5 text-white" />
        : <XCircle className="h-3.5 w-3.5 text-white" />;
    }
    if ((e.summary || "").includes("force")) return <AlertTriangle className="h-3.5 w-3.5 text-white" />;
    return <DoorOpen className="h-3.5 w-3.5 text-white" />;
  }

  function visionEventIcon(type: string) {
    switch (type) {
      case "alert": return <AlertCircle className="h-3.5 w-3.5 text-white" />;
      case "motion": return <Activity className="h-3.5 w-3.5 text-white" />;
      case "face": return <UserCheck className="h-3.5 w-3.5 text-white" />;
      default: return <CameraIcon className="h-3.5 w-3.5 text-white" />;
    }
  }

  function visionDotColor(type: string, severity: string): string {
    if (severity === "CRITICAL" || severity === "HIGH") return "bg-red-500";
    if (type === "alert") return "bg-orange-500";
    if (type === "face") return "bg-cyan-500";
    if (type === "motion") return "bg-blue-500";
    return "bg-gray-500";
  }

  function formatDateGroup(iso: string): string {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === yesterday.toDateString()) return "Hier";
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  const displayEvents = searchMode ? searchResults : events;
  const hasMore = searchMode && searchResults.length < searchTotal;

  return (
    <PageTransition>
    <div className="flex h-full flex-col">
      <PageHeader title="Chronologie" description="Flux unifie des evenements de securite en temps reel" />

      {/* Vision Timeline Filter Bar */}
      <div className="mb-4">
        <TimelineFilterBar
          onFilterChange={handleVisionFilter}
          cameras={visionCameraOptions}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-1 h-4 w-4" />
            Filtres
          </Button>
          {searchMode && (
            <Button variant="outline" size="sm" onClick={clearSearch}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Retour au direct
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className={"inline-block h-2 w-2 rounded-full " + (socketConnected ? "bg-green-500" : "bg-gray-500")} />
          <span className="text-xs text-muted-foreground">{socketConnected ? "En direct" : "Deconnecte"}</span>
        </div>
        {newEventCount > 0 && (
          <Button variant="secondary" size="sm" onClick={scrollToTop} className="ml-2">
            <ChevronUp className="mr-1 h-4 w-4" />
            Nouveaux ({newEventCount})
          </Button>
        )}
      </div>

      {showFilters && (
        <Card className="mb-4">
          <CardContent className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Du</label>
                <input type="datetime-local" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Au</label>
                <input type="datetime-local" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Porte</label>
                <select value={filterDoor} onChange={(e) => setFilterDoor(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                  <option value="">Toutes</option>
                  {doors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Zone</label>
                <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                  <option value="">Toutes</option>
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Justificatif</label>
                <select value={filterCredential} onChange={(e) => setFilterCredential(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                  <option value="">Tous</option>
                  {credentials.map((c) => <option key={c.id} value={c.id}>{c.badgeNumber || c.type} - {c.user?.firstName} {c.user?.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Decision</label>
                <select value={filterDecision} onChange={(e) => setFilterDecision(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                  <option value="">Tous</option>
                  <option value="granted">Accorde</option>
                  <option value="denied">Refuse</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={executeSearch} disabled={searchLoading}>
                <Search className="mr-1 h-4 w-4" />
                {searchLoading ? "Recherche..." : "Rechercher"}
              </Button>
              <Button size="sm" variant="outline" onClick={clearSearch}>
                <X className="mr-1 h-4 w-4" />
                Effacer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {searchMode && (
        <div className="mb-3 text-sm text-muted-foreground">
          Resultats: {searchTotal} evenements trouves
        </div>
      )}

      <div ref={timelineRef} onScroll={handleScroll} className="flex-1 overflow-y-auto pr-2">
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="mb-3 h-10 w-10 text-destructive" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={loadTimeline} className="mt-3">
              Reessayer
            </Button>
          </div>
        )}

        {!loading && !error && displayEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">Aucun evenement a afficher</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchMode ? "Aucun resultat pour ces criteres" : "Les evenements apparaitront ici en temps reel"}
            </p>
          </div>
        )}

        {/* Vision events list */}
      {!loading && visionEvents.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Événements vidéo ({visionTotal})
          </h3>
          <div className="space-y-1">
            {visionEvents.map((evt) => (
              <button
                key={evt.id}
                onClick={() => setSelectedVisionEvent(evt)}
                className={"relative w-full text-left mb-1 rounded-lg border p-3 transition-colors hover:bg-accent/50 " +
                  (selectedVisionEvent?.id === evt.id ? "border-primary bg-accent" : "border-transparent")}
              >
                <div className={"absolute -left-[1.375rem] top-3 flex h-5 w-5 items-center justify-center rounded-full " + visionDotColor(evt.eventType, evt.severity)}>
                  {visionEventIcon(evt.eventType)}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{evt.cameraName}</span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        evt.severity === "CRITICAL" && "bg-red-500/20 text-red-400",
                        evt.severity === "HIGH" && "bg-orange-500/20 text-orange-400",
                        evt.severity === "MEDIUM" && "bg-blue-500/20 text-blue-400",
                      )}>
                        {evt.severity}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5">{evt.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {evt.thumbnailUrl && (
                      <div className="h-10 w-16 overflow-hidden rounded bg-gray-800">
                        <img src={evt.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </button>
            ))}
            {visionEvents.length < visionTotal && (
              <div className="flex justify-center py-4">
                <Button variant="outline" size="sm" onClick={async () => {
                  const nextPage = visionPage + 1;
                  try {
                    const result = await searchEvents({
                      organizationId: orgId!,
                      page: nextPage,
                      limit: 50,
                    });
                    setVisionEvents((prev) => [...prev, ...(result.data || [])]);
                    setVisionPage(nextPage);
                  } catch {}
                }}>
                  Charger plus
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && displayEvents.length > 0 && (
          <div className="relative pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
            <div className="space-y-1">
              {displayEvents.map((entry) => (
                <button
                  key={entry.eventId}
                  onClick={() => setSelectedEvent(entry)}
                  className={"relative w-full text-left mb-1 rounded-lg border p-3 transition-colors hover:bg-accent/50 " +
                    (selectedEvent?.eventId === entry.eventId ? "border-primary bg-accent" : "border-transparent")}
                >
                  <div className={"absolute -left-[1.375rem] top-3 flex h-5 w-5 items-center justify-center rounded-full " + dotClass(entry)}>
                    {dotIcon(entry)}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {entry.doorName || "Porte " + entry.doorId?.slice(0, 8)}
                        </span>
                        {entry.zoneId && (
                          <span className="text-xs text-muted-foreground truncate">
                            {zones.find((z) => z.id === entry.zoneId)?.name || entry.zoneId?.slice(0, 6)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-0.5">
                        <span className={entry.summary?.includes("accorde") ? "text-green-400" : entry.summary?.includes("refuse") ? "text-red-400" : "text-blue-400"}>
                          {entry.summary}
                        </span>
                        {entry.detail && <span className="text-muted-foreground"> {" - "} {entry.detail}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {entry.videoThumbnailUrl && (
                        <div className="h-10 w-16 overflow-hidden rounded bg-gray-800">
                          <img src={entry.videoThumbnailUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                      )}
                      {entry.snapshotUrl && !entry.videoThumbnailUrl && (
                        <Video className="h-4 w-4 text-blue-400" />
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
              {hasMore && (
                <div className="flex justify-center py-4">
                  <Button variant="outline" size="sm" onClick={loadMoreSearchResults}>
                    Charger plus
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className="border-t bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">
              {selectedEvent.doorName || "Porte " + selectedEvent.doorId?.slice(0, 8)}
              <span className="ml-2 text-xs text-muted-foreground">{formatAbsoluteTime(selectedEvent.timestamp)}</span>
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-lg bg-gray-900">
              {selectedEvent.snapshotUrl ? (
                <img src={selectedEvent.snapshotUrl} alt="Snapshot" className="w-full object-cover max-h-64" />
              ) : selectedEvent.videoThumbnailUrl ? (
                <img src={selectedEvent.videoThumbnailUrl} alt="Thumbnail" className="w-full object-cover max-h-64" />
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <div className="text-center">
                    <Video className="mx-auto mb-2 h-8 w-8" />
                    <p className="text-sm">Correlation video en cours...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Evenement: </span><span className="font-medium">{selectedEvent.summary}</span></div>
              {selectedEvent.detail && (
                <div><span className="text-muted-foreground">Detail: </span><span>{selectedEvent.detail}</span></div>
              )}
              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div>
                  <span className="text-muted-foreground">Metadonnees: </span>
                  <pre className="mt-1 text-xs text-muted-foreground overflow-auto max-h-32 bg-muted p-2 rounded">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
              {selectedEvent.snapshotUrl && (
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <a href={"/cameras"} target="_blank" rel="noopener noreferrer">
                    <Eye className="mr-1 h-4 w-4" />
                    Ouvrir dans les cameras
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vision Event Detail Sheet */}
      {selectedVisionEvent && (
        <div className="border-t bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">
              {selectedVisionEvent.title}
              <span className="ml-2 text-xs text-muted-foreground">
                {new Date(selectedVisionEvent.timestamp).toLocaleString("fr-FR", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedVisionEvent(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-lg bg-gray-900">
              {selectedVisionEvent.snapshotUrl ? (
                <img src={selectedVisionEvent.snapshotUrl} alt="Snapshot" className="w-full object-cover max-h-64" />
              ) : selectedVisionEvent.thumbnailUrl ? (
                <img src={selectedVisionEvent.thumbnailUrl} alt="Thumbnail" className="w-full object-cover max-h-64" />
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <Video className="mx-auto mb-2 h-8 w-8" />
                  <p className="text-sm">Aucun aperçu disponible</p>
                </div>
              )}
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Caméra: </span>
                <span className="font-medium">{selectedVisionEvent.cameraName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Type: </span>
                <span className="font-medium capitalize">{selectedVisionEvent.eventType}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Sévérité: </span>
                <span className={cn(
                  "font-medium",
                  (selectedVisionEvent.severity === "CRITICAL" || selectedVisionEvent.severity === "HIGH") && "text-destructive",
                )}>
                  {selectedVisionEvent.severity}
                </span>
              </div>
              <ClipExportButton eventId={selectedVisionEvent.id} />
            </div>
          </div>
        </div>
      )}
    </div>
    </PageTransition>
  );
}
