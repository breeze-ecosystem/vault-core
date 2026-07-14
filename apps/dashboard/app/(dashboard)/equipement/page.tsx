"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchCameraHealth,
  fetchReaderHealth,
  fetchControllerHealth,
  type CameraHealthDto,
  type ReaderHealthDto,
  type ControllerHealthDto,
} from "@/lib/api";
import {
  Video,
  Radio,
  Cpu,
  Wifi,
  WifiOff,
  AlertTriangle,
  BatteryWarning,
} from "lucide-react";
import Link from "next/link";

type StatusCount = { total: number; online: number; offline: number; degraded: number };

function countStatuses(items: { status?: string }[]): StatusCount {
  const counts = { total: items.length, online: 0, offline: 0, degraded: 0 };
  for (const item of items) {
    const s = item.status?.toLowerCase() ?? "";
    if (s === "online" || s === "ONLINE") counts.online++;
    else if (s === "offline" || s === "OFFLINE") counts.offline++;
    else if (s === "degraded" || s === "DEGRADED") counts.degraded++;
  }
  return counts;
}

const statusColors: Record<string, string> = {
  ONLINE: "success",
  OFFLINE: "destructive",
  DEGRADED: "warning",
};

export default function EquipmentOverviewPage() {
  const [cameras, setCameras] = useState<CameraHealthDto[]>([]);
  const [readers, setReaders] = useState<ReaderHealthDto[]>([]);
  const [controllers, setControllers] = useState<ControllerHealthDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [cams, rds, ctrls] = await Promise.all([
        fetchCameraHealth(),
        fetchReaderHealth(),
        fetchControllerHealth(),
      ]);
      setCameras(cams);
      setReaders(rds);
      setControllers(ctrls);
    } catch {
      // Silently handle — data will retry on next interval
    } finally {
      setLoading(false);
    }
  }

  const camStats = countStatuses(cameras.map((c) => ({ status: c.status })));
  const readerStats = countStatuses(
    readers.map((r) => ({ status: r.status })),
  );
  const controllerStats = countStatuses(
    controllers.map((c) => ({ status: c.connection_stability === "stable" ? "ONLINE" : "OFFLINE" })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Santé des équipements"
        description="Surveillance en temps réel de l'état des équipements — actualisation toutes les 30s"
      />

      {/* Cameras Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Caméras
            </CardTitle>
            <Badge variant="outline">{camStats.total} totale{camStats.total > 1 ? "s" : ""}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg bg-success/10 p-3 text-center">
              <p className="text-2xl font-bold text-success">{camStats.online}</p>
              <p className="text-xs text-muted-foreground">En ligne</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{camStats.offline}</p>
              <p className="text-xs text-muted-foreground">Hors ligne</p>
            </div>
            <div className="rounded-lg bg-warning/10 p-3 text-center">
              <p className="text-2xl font-bold text-warning">{camStats.degraded}</p>
              <p className="text-xs text-muted-foreground">Dégradé</p>
            </div>
          </div>
          <Link href="/equipement/cameras">
            <Button variant="outline" size="sm" className="w-full">
              Voir les caméras
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Readers Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              Lecteurs
            </CardTitle>
            <Badge variant="outline">{readerStats.total} totale{readerStats.total > 1 ? "s" : ""}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg bg-success/10 p-3 text-center">
              <p className="text-2xl font-bold text-success">{readerStats.online}</p>
              <p className="text-xs text-muted-foreground">En ligne</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{readerStats.offline}</p>
              <p className="text-xs text-muted-foreground">Hors ligne</p>
            </div>
            <div className="rounded-lg bg-warning/10 p-3 text-center">
              <p className="text-2xl font-bold text-warning">{readerStats.degraded}</p>
              <p className="text-xs text-muted-foreground">Dégradé</p>
            </div>
          </div>
          <Link href="/equipement/lecteurs">
            <Button variant="outline" size="sm" className="w-full">
              Voir les lecteurs
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Controllers Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Contrôleurs
            </CardTitle>
            <Badge variant="outline">{controllerStats.total} totale{controllerStats.total > 1 ? "s" : ""}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg bg-success/10 p-3 text-center">
              <p className="text-2xl font-bold text-success">{controllerStats.online}</p>
              <p className="text-xs text-muted-foreground">Stable</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{controllerStats.offline}</p>
              <p className="text-xs text-muted-foreground">Instable/Hors ligne</p>
            </div>
          </div>
          <Link href="/equipement/controleurs">
            <Button variant="outline" size="sm" className="w-full">
              Voir les contrôleurs
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Low battery alerts section */}
      {controllers.filter((c) => c.battery_level !== undefined && c.battery_level !== null && c.battery_level < 20).length > 0 && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <BatteryWarning className="h-5 w-5" />
              Batteries faibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {controllers
                .filter((c) => c.battery_level !== undefined && c.battery_level !== null && c.battery_level < 20)
                .map((c) => (
                  <div key={c.controller_id} className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
                    <span className="text-sm font-medium">{c.controller_id?.substring(0, 8)}...</span>
                    <Badge variant="warning">{c.battery_level?.toFixed(0)}%</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
