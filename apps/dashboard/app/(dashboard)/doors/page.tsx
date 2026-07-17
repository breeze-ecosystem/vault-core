"use client";

import { useEffect, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  fetchAllDoorStates,
  fetchZones,
  lockdownZone,
  emergencyUnlockZone,
  clearEmergencyOverride,
  updateDoorAlertConfig,
  sendDoorCommand,
  type DoorStateDto,
  type ZoneDto,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/i18n/context";
import {
  ShieldCheck,
  Unlock,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Wifi,
  WifiOff,
  DoorOpen,
  Search,
  ChevronDown,
  Settings2,
  ShieldBan,
  ShieldCheckIcon,
  DoorClosed,
} from "lucide-react";
import { DoorCard, type CommandState } from "@/components/doors/door-card";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { fetchWithAuth } from "@/lib/auth-client";

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.error("NEXT_PUBLIC_API_URL is not defined. Set it in .env or .env.local");
}
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const WS_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// ── Page Component ──

export default function DoorsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const siteId = (user as any)?.siteId as string | undefined;
  const [doors, setDoors] = useState<DoorStateDto[]>([]);
  const [zones, setZones] = useState<ZoneDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyZoneId, setEmergencyZoneId] = useState("");
  const [showAlertConfigModal, setShowAlertConfigModal] = useState(false);
  const [configDoorId, setConfigDoorId] = useState<string | null>(null);
  const [heldOpenThreshold, setHeldOpenThreshold] = useState(30);
  const [heldOpenTimes, setHeldOpenTimes] = useState<Record<string, number>>({});
  const [commandStates, setCommandStates] = useState<Map<string, CommandState>>(new Map());
  const [lastCommands, setLastCommands] = useState<Map<string, "lock" | "unlock">>(new Map());

  // Bulk operation confirmation
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState<"lock" | "unlock">("lock");

  const isAdmin =
    user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const canEmergency =
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    user?.role === "SUPERVISOR";

  // ── Data Load ──

  const loadDoors = useCallback(async () => {
    try {
      const [doorStates, zoneList] = await Promise.all([
        fetchAllDoorStates(),
        fetchZones(),
      ]);
      setDoors(doorStates);
      setZones(zoneList);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Lock/Unlock Handlers ──

  async function handleLock(doorId: string) {
    setCommandStates((prev) => new Map(prev).set(doorId, "sending"));
    setLastCommands((prev) => new Map(prev).set(doorId, "lock"));

    try {
      await sendDoorCommand(doorId, "lock");
      setCommandStates((prev) => new Map(prev).set(doorId, "sent"));
      toast("Porte verrouillée", "success");
    } catch {
      // D-11: Auto-retry once after 2-second timeout
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        await sendDoorCommand(doorId, "lock");
        setCommandStates((prev) => new Map(prev).set(doorId, "sent"));
        toast("Porte verrouillée (après nouvelle tentative)", "success");
      } catch {
        setCommandStates((prev) => new Map(prev).set(doorId, "failed"));
        toast("Échec de la commande après nouvelle tentative", "error");
      }
    }

    // Fallback: mark as failed if no acknowledgment within 5 seconds
    setTimeout(() => {
      setCommandStates((prev) => {
        const current = prev.get(doorId);
        if (current === "sent") return new Map(prev).set(doorId, "failed");
        return prev;
      });
    }, 5000);
  }

  async function handleUnlock(doorId: string) {
    setCommandStates((prev) => new Map(prev).set(doorId, "sending"));
    setLastCommands((prev) => new Map(prev).set(doorId, "unlock"));

    try {
      await sendDoorCommand(doorId, "unlock");
      setCommandStates((prev) => new Map(prev).set(doorId, "sent"));
      toast("Porte déverrouillée", "success");
    } catch {
      // D-11: Auto-retry once after 2-second timeout
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        await sendDoorCommand(doorId, "unlock");
        setCommandStates((prev) => new Map(prev).set(doorId, "sent"));
        toast("Porte déverrouillée (après nouvelle tentative)", "success");
      } catch {
        setCommandStates((prev) => new Map(prev).set(doorId, "failed"));
        toast("Échec de la commande après nouvelle tentative", "error");
      }
    }

    // Fallback: mark as failed if no acknowledgment within 5 seconds
    setTimeout(() => {
      setCommandStates((prev) => {
        const current = prev.get(doorId);
        if (current === "sent") return new Map(prev).set(doorId, "failed");
        return prev;
      });
    }, 5000);
  }

  // D-11: Manual retry from DoorCard "Réessayer" button
  async function handleRetry(doorId: string, command: "lock" | "unlock") {
    if (command === "lock") return handleLock(doorId);
    return handleUnlock(doorId);
  }

  // ── Zone Change ──

  async function handleZoneChange(doorId: string, zoneId: string) {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/doors/${doorId}`, {
        method: "PATCH",
        body: JSON.stringify({ zoneId }),
      });
      if (!res.ok) throw new Error("Échec de la mise à jour de zone");
      toast("Zone mise à jour", "success");
      loadDoors();
    } catch (e: any) {
      toast(e.message || "Échec de la mise à jour de zone", "error");
    }
  }

  // ── Bulk Operations ──

  function handleBulkLock() {
    if (!selectedZone) return;
    setBulkAction("lock");
    setShowBulkConfirm(true);
  }

  function handleBulkUnlock() {
    if (!selectedZone) return;
    setBulkAction("unlock");
    setShowBulkConfirm(true);
  }

  async function handleBulkConfirm() {
    if (!selectedZone) return;
    try {
      if (bulkAction === "lock") {
        await lockdownZone(selectedZone);
        toast("Zone verrouillée", "success");
      } else {
        await emergencyUnlockZone(selectedZone);
        toast("Zone déverrouillée", "success");
      }
      setShowBulkConfirm(false);
      loadDoors();
    } catch (e: any) {
      toast(e.message || "Échec de l'opération", "error");
    }
  }

  // ── Socket.IO Connection ──

  useEffect(() => {
    loadDoors();

    const socket: Socket = io(`${WS_URL}/ws/doors`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      setSocketConnected(true);
      if (siteId) {
        socket.emit("subscribe:site", { siteId });
      }
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("state-update", (payload: any) => {
      setDoors((prev) =>
        prev.map((d) =>
          d.doorId === payload.doorId
            ? { ...d, state: payload.newState, lastChanged: payload.timestamp }
            : d,
        ),
      );

      if (payload.newState === "held-open") {
        setHeldOpenTimes((prev) => ({
          ...prev,
          [payload.doorId]: 0,
        }));
      } else {
        setHeldOpenTimes((prev) => {
          const next = { ...prev };
          delete next[payload.doorId];
          return next;
        });
      }
    });

    socket.on("emergency-update", (payload: any) => {
      const zone = zones.find((z) => z.id === payload.zoneId);
      const zoneName = zone?.name ?? payload.zoneId;
      const statusLabels: Record<string, string> = {
        lockdown: "Verrouillage d'urgence",
        "emergency-unlock": "Déverrouillage d'urgence",
        cleared: "Mode normal rétabli",
      };
      toast(
        `${zoneName}: ${statusLabels[payload.status] ?? payload.status}`,
        payload.status === "lockdown" ? "error" : "success",
      );
      loadDoors();
    });

    // D-11: Command state updates from server
    socket.on("door:command-state", (payload: any) => {
      setCommandStates((prev) => new Map(prev).set(payload.doorId, payload.state));
    });

    return () => {
      socket.disconnect();
    };
  }, [siteId, loadDoors]); // eslint-disable-line react-hooks/exhaustive-deps

  // Held-open timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      setHeldOpenTimes((prev) => {
        const next: Record<string, number> = {};
        let changed = false;
        for (const [id, sec] of Object.entries(prev)) {
          if (doors.some((d) => d.doorId === id && d.state === "held-open")) {
            next[id] = sec + 1;
            changed = true;
          }
        }
        return changed ? { ...prev, ...next } : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [doors]);

  // ── Filters ──

  const filteredDoors = doors.filter((d) => {
    if (selectedZone && d.zoneId !== selectedZone) return false;
    if (
      searchQuery &&
      !d.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const selectedZoneName = zones.find((z) => z.id === selectedZone)?.name ?? "";

  // ── Emergency Actions ──

  async function handleLockdown() {
    if (!emergencyZoneId) return;
    try {
      await lockdownZone(emergencyZoneId);
      toast(t("doors.emergency.lockdownActivated"), "success");
      setShowEmergencyModal(false);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function handleEmergencyUnlock() {
    if (!emergencyZoneId) return;
    try {
      await emergencyUnlockZone(emergencyZoneId);
      toast(t("doors.emergency.unlockActivated"), "success");
      setShowEmergencyModal(false);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function handleClearEmergency() {
    if (!emergencyZoneId) return;
    try {
      await clearEmergencyOverride(emergencyZoneId);
      toast(t("doors.normalModeRestored"), "success");
      setShowEmergencyModal(false);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  // ── Alert Config ──

  function openAlertConfig(door: DoorStateDto) {
    setConfigDoorId(door.doorId);
    setHeldOpenThreshold(30);
    setShowAlertConfigModal(true);
  }

  async function handleSaveAlertConfig() {
    if (!configDoorId) return;
    try {
      await updateDoorAlertConfig(configDoorId, {
        heldOpenThresholdMs: heldOpenThreshold * 1000,
      });
      toast(t("doors.alertConfigUpdated"), "success");
      setShowAlertConfigModal(false);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  // ── Render ──

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-lg font-medium">{t("common.errorLoading")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setError(null);
              setLoading(true);
              loadDoors();
            }}
          >
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <PageHeader
            title={t("doors.title")}
            description={t("doors.description")}
          />
          {!socketConnected && !loading && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
              <WifiOff className="h-4 w-4" />
              {t("doors.connectionLost")}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {socketConnected && (
            <div className="flex items-center gap-1.5 text-xs text-success">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              {t("doors.live")}
            </div>
          )}
          {canEmergency && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setShowEmergencyModal(true);
                setEmergencyZoneId(zones[0]?.id ?? "");
              }}
            >
              <ShieldBan className="h-4 w-4" />
              {t("doors.emergencyActions")}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <DoorOpen className="h-4 w-4 text-muted-foreground" />
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[160px]"
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
          >
            <option value="">{t("doors.filters.allZones")}</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm"
            placeholder={t("doors.filters.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredDoors.length} / {doors.length}{" "}
          {t("doors.title").toLowerCase()}
        </div>
      </div>

      {/* Bulk Operations Bar (D-12) */}
      {selectedZone && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <span className="text-sm font-medium text-muted-foreground">
            Zone: {selectedZoneName || selectedZone}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-success/30 text-success hover:bg-success/10"
              onClick={handleBulkLock}
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              Verrouiller la zone
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={handleBulkUnlock}
            >
              <Unlock className="h-4 w-4 mr-1" />
              Déverrouiller la zone
            </Button>
          </div>
        </div>
      )}

      {/* Door Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-3 w-28" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredDoors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <DoorClosed className="h-12 w-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">
              {doors.length === 0
                ? t("doors.noDoors")
                : t("doors.noSearchResults")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDoors.map((door) => (
            <DoorCard
              key={door.doorId}
              door={door}
              zones={zones}
              userRole={user?.role ?? "VIEWER"}
              onLock={handleLock}
              onUnlock={handleUnlock}
              onZoneChange={handleZoneChange}
              onAlertConfig={openAlertConfig}
              isAdmin={isAdmin}
              heldOpenSeconds={
                door.state === "held-open"
                  ? heldOpenTimes[door.doorId] ?? 0
                  : null
              }
              commandState={commandStates.get(door.doorId)}
              onRetry={handleRetry}
              lastCommand={lastCommands.get(door.doorId)}
            />
          ))}
        </div>
      )}

      {/* Bulk Confirmation Dialog (D-12) */}
      <ConfirmationDialog
        isOpen={showBulkConfirm}
        title={
          bulkAction === "lock"
            ? "Verrouillage de zone"
            : "Déverrouillage de zone"
        }
        description={
          bulkAction === "lock"
            ? `Verrouiller toutes les portes de ${selectedZoneName} ? Cette action est irréversible.`
            : `Déverrouiller toutes les portes de ${selectedZoneName} ? Cette action est irréversible.`
        }
        confirmLabel={
          bulkAction === "lock"
            ? "Verrouiller toutes les portes"
            : "Déverrouiller toutes les portes"
        }
        onConfirm={handleBulkConfirm}
        onCancel={() => setShowBulkConfirm(false)}
        requiredRole="ADMIN"
        userRole={user?.role}
      />

      {/* Emergency Controls Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ShieldBan className="h-5 w-5 text-destructive" />
              {t("doors.emergencyActions")}
            </h3>
            <div className="mb-4">
              <label className="block text-sm text-muted-foreground mb-1">
                {t("doors.affectedZone")}
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={emergencyZoneId}
                onChange={(e) => setEmergencyZoneId(e.target.value)}
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={handleLockdown}
              >
                <ShieldCheckIcon className="h-4 w-4" />
                {t("doors.emergency.lockdown")}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
                onClick={handleEmergencyUnlock}
              >
                <Unlock className="h-4 w-4" />
                {t("doors.emergency.unlock")}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 text-success"
                onClick={handleClearEmergency}
              >
                <ShieldCheck className="h-4 w-4" />
                {t("doors.emergency.clear")}
              </Button>
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowEmergencyModal(false)}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Config Modal */}
      {showAlertConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {t("doors.alertConfig.title")}
            </h3>
            <div className="mb-4">
              <label className="block text-sm text-muted-foreground mb-2">
                {t("doors.alertConfig.heldOpenThreshold")} — de 30 à 300
              </label>
              <input
                type="number"
                min={30}
                max={300}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={heldOpenThreshold}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 30 && v <= 300) {
                    setHeldOpenThreshold(v);
                  }
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                L&apos;alerte se déclenchera si la porte reste ouverte plus de{" "}
                {heldOpenThreshold} secondes.
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSaveAlertConfig}>
                {t("common.save")}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAlertConfigModal(false)}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
