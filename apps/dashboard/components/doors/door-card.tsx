"use client";

import {
  ShieldCheck,
  Unlock,
  Lock,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Wifi,
  DoorClosed,
  Settings2,
  DoorOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DoorStateDto, ZoneDto } from "@/lib/api";

export type CommandState = "idle" | "sending" | "sent" | "acknowledged" | "failed";

export interface DoorCardProps {
  door: DoorStateDto;
  zones: ZoneDto[];
  userRole: string;
  onLock: (doorId: string) => void;
  onUnlock: (doorId: string) => void;
  onZoneChange: (doorId: string, zoneId: string) => void;
  onAlertConfig: (door: DoorStateDto) => void;
  isAdmin: boolean;
  heldOpenSeconds: number | null;
  commandState?: CommandState;
  onRetry?: (doorId: string, command: "lock" | "unlock") => void;
  lastCommand?: "lock" | "unlock";
}

// ── State Configuration ──

interface StateDisplay {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgClass: string;
  pulse?: boolean;
}

const stateConfig: Record<string, StateDisplay> = {
  locked: {
    label: "Verrouillée",
    icon: <ShieldCheck className="h-8 w-8" />,
    color: "text-success",
    bgClass: "bg-success/10 border-success/20",
  },
  unlocked: {
    label: "Déverrouillée",
    icon: <Unlock className="h-8 w-8" />,
    color: "text-blue-400",
    bgClass: "bg-blue-500/10 border-blue-500/20",
  },
  "held-open": {
    label: "Ouverte (anormale)",
    icon: <Clock className="h-8 w-8" />,
    color: "text-orange-400",
    bgClass: "bg-orange-500/10 border-orange-500/20",
  },
  forced: {
    label: "Forcée",
    icon: <AlertTriangle className="h-8 w-8" />,
    color: "text-destructive",
    bgClass: "bg-destructive/10 border-destructive/20",
    pulse: true,
  },
  unsecured: {
    label: "Non sécurisée",
    icon: <ShieldAlert className="h-8 w-8" />,
    color: "text-yellow-400",
    bgClass: "bg-yellow-500/10 border-yellow-500/20",
  },
  desynchronized: {
    label: "Désynchronisée",
    icon: <Wifi className="h-8 w-8" />,
    color: "text-purple-400",
    bgClass: "bg-purple-500/10 border-purple-500/20",
  },
};

function getStateConfig(state: string): StateDisplay {
  return (
    stateConfig[state] ?? {
      label: state,
      icon: <DoorClosed className="h-8 w-8" />,
      color: "text-muted-foreground",
      bgClass: "bg-muted/10 border-muted/20",
    }
  );
}

export function DoorCard({
  door,
  zones,
  userRole,
  onLock,
  onUnlock,
  onZoneChange,
  onAlertConfig,
  isAdmin,
  heldOpenSeconds,
  commandState,
  onRetry,
  lastCommand,
}: DoorCardProps) {
  const sc = getStateConfig(door.state);
  const canControl =
    userRole !== "VIEWER" && userRole !== "AUDITOR";

  return (
    <Card
      className={`group overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-lg ${
        sc.pulse ? "animate-pulse border-destructive/40" : ""
      }`}
    >
      <div className={`flex items-center gap-4 p-5 ${sc.bgClass} border-b`}>
        <div className={sc.color}>{sc.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{door.name}</p>
          <p className="text-sm text-muted-foreground">
            {door.zoneName ? `Zone: ${door.zoneName}` : "—"}
          </p>
          {door.controllerId && (
            <p className="text-xs text-muted-foreground/60 font-mono">
              {door.controllerId}
            </p>
          )}
        </div>
        <Badge className={`${sc.bgClass} ${sc.color} border text-xs`}>
          {sc.label}
        </Badge>
      </div>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mt-3">
          {canControl && (
            <>
              {door.state === "locked" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => onUnlock(door.doorId)}
                >
                  <Unlock className="h-4 w-4 mr-1" /> Déverrouiller
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-success/30 text-success hover:bg-success/10"
                  onClick={() => onLock(door.doorId)}
                  disabled={door.state === "desynchronized"}
                >
                  <Lock className="h-4 w-4 mr-1" /> Verrouiller
                </Button>
              )}
            </>
          )}

          {/* Command state indicator (D-11) */}
          {commandState && commandState !== "idle" && (
            <span
              className={`text-xs ${
                commandState === "acknowledged"
                  ? "text-success"
                  : commandState === "failed"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {commandState === "sending"
                ? "Envoi..."
                : commandState === "sent"
                ? "Envoyé"
                : commandState === "acknowledged"
                ? "Acquitté"
                : "Échec"}
              {commandState === "failed" && onRetry && lastCommand && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-auto px-1 py-0 text-xs text-destructive underline hover:no-underline"
                  onClick={() => onRetry(door.doorId, lastCommand)}
                >
                  Réessayer
                </Button>
              )}
            </span>
          )}

          {/* Zone dropdown (D-05) — isAdmin only */}
          {isAdmin && (
            <select
              value={door.zoneId}
              onChange={(e) => onZoneChange(door.doorId, e.target.value)}
              className="ml-auto rounded-md border border-input bg-background px-2 py-1 text-xs"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-muted-foreground">
            État depuis{" "}
            {heldOpenSeconds !== null && door.state === "held-open"
              ? `${heldOpenSeconds}s`
              : new Date(door.lastChanged).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
          </div>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => onAlertConfig(door)}
            >
              <Settings2 className="h-3 w-3" />
              Alerte
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
