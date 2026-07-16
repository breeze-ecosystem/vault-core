"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { fetchSlaProfiles, updateSlaProfiles } from "@/lib/api";

interface SlaProfileGridProps {
  orgId: string;
}

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: "Critique",
  HIGH: "Haute",
  MEDIUM: "Moyenne",
  LOW: "Basse",
};

export function SlaProfileGrid({ orgId }: SlaProfileGridProps) {
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSlaProfiles(orgId);
        setProfiles(data);
      } catch {
        toast("Échec du chargement des profils SLA", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  const handleChange = useCallback((severity: string, field: string, value: any) => {
    setProfiles((prev) => ({
      ...prev,
      [severity]: { ...prev[severity], [field]: value },
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateSlaProfiles(orgId, profiles);
      toast("Profils SLA mis à jour", "success");
    } catch {
      toast("Échec de la mise à jour", "error");
    } finally {
      setSaving(false);
    }
  }, [orgId, profiles]);

  if (loading) {
    return (
      <GlassCard className="p-4">
        <Skeleton className="h-6 w-32 mb-4" />
        {SEVERITIES.map((s) => (
          <Skeleton key={s} className="h-10 w-full mb-2" />
        ))}
        <Skeleton className="h-10 w-24 mt-2" />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4">
      <h3 className="text-sm font-semibold mb-4">Profils SLA par sévérité</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4">Sévérité</th>
            <th className="text-left py-2 pr-4">Délai (min)</th>
            <th className="text-left py-2 pr-4">Notifier</th>
          </tr>
        </thead>
        <tbody>
          {SEVERITIES.map((severity) => {
            const profile = profiles[severity] || { slaMinutes: 30, notifyOnBreach: true, escalationUserIds: [] };
            return (
              <tr key={severity} className="border-b border-border/50">
                <td className="py-2 pr-4 font-medium">{SEVERITY_LABELS[severity]}</td>
                <td className="py-2 pr-4">
                  <input
                    type="number"
                    min={1}
                    className="w-20 rounded border border-input bg-background px-2 py-1 text-sm"
                    value={profile.slaMinutes ?? 30}
                    onChange={(e) => handleChange(severity, "slaMinutes", parseInt(e.target.value, 10) || 30)}
                  />
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="checkbox"
                    checked={profile.notifyOnBreach ?? true}
                    onChange={(e) => handleChange(severity, "notifyOnBreach", e.target.checked)}
                    className="rounded"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Button onClick={handleSave} disabled={saving} className="mt-4">
        {saving ? "Enregistrement..." : "Appliquer"}
      </Button>
    </GlassCard>
  );
}
