"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchCameraDoorAssociations,
  type CameraDoorAssociationDto,
} from "@/lib/api";
import {
  Camera,
  DoorOpen,
  Link2,
  Unlink,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const statusConfig: Record<
  string,
  { badge: "success" | "destructive" | "warning" | "default"; label: string }
> = {
  mapped: { badge: "success", label: "Associé" },
  orphan_camera: { badge: "destructive", label: "Caméra orpheline" },
  orphan_door: { badge: "warning", label: "Porte orpheline" },
  zone_mismatch: { badge: "warning", label: "Décalage de zone" },
};

export default function CameraMappingPage() {
  const [associations, setAssociations] = useState<CameraDoorAssociationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteFilter, setSiteFilter] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [siteFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchCameraDoorAssociations(siteFilter || undefined);
      setAssociations(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const mapped = associations.filter((a) => a.status === "mapped");
  const orphanCameras = associations.filter((a) => a.status === "orphan_camera");
  const orphanDoors = associations.filter((a) => a.status === "orphan_door");
  const zoneMismatches = associations.filter((a) => a.status === "zone_mismatch");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cartographie caméra-porte" description="Visualisation des associations entre caméras et portes" />
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartographie caméra-porte"
        description="Visualisation des associations entre caméras et portes"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Caméras totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold">{associations.filter(a => a.cameraId).length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Portes totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold">{associations.filter(a => a.doorId).length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paires associées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-success" />
              <span className="text-3xl font-bold">{mapped.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Caméras orphelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Unlink className="h-5 w-5 text-destructive" />
              <span className={`text-3xl font-bold ${orphanCameras.length > 0 ? "text-destructive" : ""}`}>
                {orphanCameras.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Décalages de zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className={`text-3xl font-bold ${zoneMismatches.length > 0 ? "text-warning" : ""}`}>
                {zoneMismatches.length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Association Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Associations caméra-porte</CardTitle>
        </CardHeader>
        <CardContent>
          {associations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Link2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucune caméra ou porte trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground py-2 px-2">Caméra</th>
                    <th className="text-left font-medium text-muted-foreground py-2 px-2">Porte</th>
                    <th className="text-center font-medium text-muted-foreground py-2 px-2">Zone</th>
                    <th className="text-center font-medium text-muted-foreground py-2 px-2">Angle</th>
                    <th className="text-center font-medium text-muted-foreground py-2 px-2">Priorité</th>
                    <th className="text-center font-medium text-muted-foreground py-2 px-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {associations.map((a, i) => {
                    const cfg = statusConfig[a.status] ?? { badge: "default" as const, label: a.status };
                    return (
                      <tr key={`${a.cameraId}-${a.doorId}-${i}`} className="border-b last:border-b-0 hover:bg-muted/50">
                        <td className="py-2 px-2 font-medium">
                          <span className="flex items-center gap-1">
                            <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                            {a.cameraName ?? (a.cameraId ? a.cameraId.substring(0, 8) : "—")}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className="flex items-center gap-1">
                            <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            {a.doorName ?? (a.doorId ? a.doorId.substring(0, 8) : "—")}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          {a.doorZoneId ? (
                            <Badge variant={a.status === "zone_mismatch" ? "warning" : "outline"}>
                              {a.doorZoneId.substring(0, 8)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center text-muted-foreground">
                          {a.angle ?? "—"}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {a.priority > 0 ? (
                            <Badge variant="outline">{a.priority}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge variant={cfg.badge}>{cfg.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orphan Cameras Section */}
      {orphanCameras.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Unlink className="h-5 w-5" />
              Caméras non associées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orphanCameras.map((a) => (
                <div key={a.cameraId} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{a.cameraName}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Non associé — ajouter une association</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orphan Doors Section */}
      {orphanDoors.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-warning">
              <Unlink className="h-5 w-5" />
              Portes non associées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orphanDoors.map((a) => (
                <div key={a.doorId} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{a.doorName}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Non associé — ajouter une association</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zone Mismatch Details */}
      {zoneMismatches.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Décalages de zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {zoneMismatches.map((a, i) => (
                <div key={`mismatch-${i}`} className="rounded-lg bg-muted/50 p-3 text-sm">
                  Caméra <span className="font-medium">{a.cameraName}</span> est associée à la porte{" "}
                  <span className="font-medium">{a.doorName}</span> (zone {a.doorZoneId?.substring(0, 8)})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All associated - no orphans */}
      {orphanCameras.length === 0 && orphanDoors.length === 0 && zoneMismatches.length === 0 && associations.length > 0 && (
        <Card className="border-success/30">
          <CardContent className="flex items-center justify-center py-6">
            <div className="flex items-center gap-3 text-success">
              <Link2 className="h-6 w-6" />
              <p className="font-medium">Tous les équipements sont associés</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
