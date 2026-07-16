"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { fetchIncidentEvidence, removeIncidentEvidence, type IncidentEvidenceDto } from "@/lib/api";

interface EvidenceBundleListProps {
  incidentId: string;
}

const TYPE_ICONS: Record<string, string> = {
  access_event: "🚪",
  alert: "🚨",
  video_clip: "🎥",
  snapshot: "📷",
  document: "📄",
  note: "📝",
};

const TYPE_LABELS: Record<string, string> = {
  access_event: "Événement d'accès",
  alert: "Alerte",
  video_clip: "Clip vidéo",
  snapshot: "Capture",
  document: "Document",
  note: "Note",
};

export function EvidenceBundleList({ incidentId }: EvidenceBundleListProps) {
  const [evidence, setEvidence] = useState<IncidentEvidenceDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchIncidentEvidence(incidentId);
      setEvidence(data);
    } catch {
      toast("Échec du chargement des preuves", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [incidentId]);

  const handleRemove = async (evidenceId: string) => {
    try {
      await removeIncidentEvidence(incidentId, evidenceId);
      setEvidence((prev) => prev.filter((e) => e.id !== evidenceId));
      toast("Preuve retirée", "success");
    } catch {
      toast("Échec du retrait", "error");
    }
  };

  if (loading) {
    return (
      <GlassCard className="p-4">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-8 w-full mb-2" />
      </GlassCard>
    );
  }

  const grouped: Record<string, IncidentEvidenceDto[]> = {};
  for (const e of evidence) {
    const key = e.type || "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }

  return (
    <GlassCard className="p-4">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        Preuves
        <span className="text-xs text-muted-foreground">({evidence.length} preuve(s) liée(s))</span>
      </h3>

      {evidence.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune preuve automatique trouvée dans cette fenêtre</p>
      ) : (
        Object.entries(grouped).map(([type, items]) => (
          <div key={type} className="mb-3">
            <h4 className="text-xs text-muted-foreground mb-1">
              {TYPE_ICONS[type] || "📎"} {TYPE_LABELS[type] || type}
            </h4>
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1 text-sm">
                <span className="truncate">{item.description || item.type}</span>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(item.id)}>
                  × Retirer
                </Button>
              </div>
            ))}
          </div>
        ))
      )}
    </GlassCard>
  );
}
