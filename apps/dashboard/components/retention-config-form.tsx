"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Save,
  Plus,
  Trash2,
  HardDrive,
  AlertCircle,
  Loader2,
  Clock,
  Shield,
} from "lucide-react";
import type { RetentionPolicyDto, Site } from "@/lib/api";

const RETENTION_OPTIONS = [
  { days: 30, label: "30 jours", desc: "Rétention standard" },
  { days: 60, label: "60 jours", desc: "2 mois de conservation" },
  { days: 90, label: "90 jours", desc: "Trimestriel" },
  { days: 180, label: "180 jours", desc: "Semestriel" },
  { days: 365, label: "1 an", desc: "Annuel" },
  { days: 730, label: "2 ans", desc: "Maximum légal" },
];

const EXPORT_FORMATS = ["csv", "pdf"] as const;
type ExportFormat = (typeof EXPORT_FORMATS)[number];

const DEFAULT_EVENT_TYPES = [
  "alert_created",
  "access_granted",
  "access_denied",
  "door_forced",
  "ai_detection",
  "face_match",
  "weapon_detected",
  "compliance_event",
  "fire_alarm",
  "bms_event",
];

interface RetentionRuleEntry {
  id: string; // unique key
  siteId: string | null;
  eventType: string;
  retentionDays: number;
  exportBeforePurge: boolean;
  exportFormat: ExportFormat;
}

interface RetentionConfigFormProps {
  data: RetentionPolicyDto[];
  sites: Site[];
  eventTypes?: string[];
  loading?: boolean;
  onSave: (policies: RetentionPolicyDto[]) => Promise<void>;
  onRetry?: () => void;
}

let ruleIdCounter = 0;
function nextRuleId(): string {
  return `rule-${++ruleIdCounter}`;
}

function policyToRule(policy: RetentionPolicyDto, siteId: string | null): RetentionRuleEntry {
  return {
    id: nextRuleId(),
    siteId,
    eventType: policy.eventType || policy.tableType,
    retentionDays: policy.retentionDays,
    exportBeforePurge: false,
    exportFormat: "pdf",
  };
}

export function RetentionConfigForm({
  data,
  sites,
  eventTypes: customEventTypes,
  loading = false,
  onSave,
  onRetry,
}: RetentionConfigFormProps) {
  const eventTypes = customEventTypes && customEventTypes.length > 0 ? customEventTypes : DEFAULT_EVENT_TYPES;
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [rules, setRules] = useState<RetentionRuleEntry[]>([]);
  const [saving, setSaving] = useState(false);

  // Initialize rules from data when data changes
  useEffect(() => {
    const initial = data.map((p) => policyToRule(p, null));
    if (initial.length === 0) {
      // Start with default rules for "Tous les sites"
      setRules(
        eventTypes.map((et) => ({
          id: nextRuleId(),
          siteId: null,
          eventType: et,
          retentionDays: 90,
          exportBeforePurge: false,
          exportFormat: "pdf" as ExportFormat,
        })),
      );
    } else {
      setRules(initial);
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRules = rules.filter(
    (r) => selectedSiteId === null || r.siteId === selectedSiteId,
  );

  const updateRule = useCallback(
    (ruleId: string, updates: Partial<RetentionRuleEntry>) => {
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
      );
    },
    [],
  );

  const removeRule = useCallback((ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  }, []);

  const addRule = useCallback(() => {
    const newRule: RetentionRuleEntry = {
      id: nextRuleId(),
      siteId: selectedSiteId,
      eventType: eventTypes[0]! ?? DEFAULT_EVENT_TYPES[0],
      retentionDays: 90,
      exportBeforePurge: false,
      exportFormat: "pdf",
    };
    setRules((prev) => [...prev, newRule]);
  }, [selectedSiteId, eventTypes]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const policies: RetentionPolicyDto[] = rules.map((r) => ({
        id: "",
        eventType: r.eventType,
        tableType: r.eventType,
        retentionDays: r.retentionDays,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await onSave(policies);
      toast("Configuration de rétention enregistrée", "success");
    } catch (err: any) {
      toast(err.message || "Erreur lors de l'enregistrement", "error");
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <GlassCard key={i} className="p-6">
            <Skeleton className="mb-3 h-5 w-48" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-8 w-full" />
          </GlassCard>
        ))}
      </div>
    );
  }

  // Error state when no sites
  if (sites.length === 0) {
    return (
      <GlassCard className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
        <p className="text-base font-medium">Aucune configuration de rétention</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Aucun site n&apos;est configuré. Créez un site pour commencer.
        </p>
        {onRetry && (
          <Button variant="outline" className="mt-4" onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Site selector */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium">Site</label>
            <Select
              value={selectedSiteId ?? "all"}
              onValueChange={(v) => setSelectedSiteId(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un site" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Sites</SelectLabel>
                  <SelectItem value="all">Tous les sites</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Rules */}
      {filteredRules.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center p-8 text-center">
          <HardDrive className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-base font-medium">Aucune configuration de rétention</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutez une règle de rétention pour ce site.
          </p>
          <Button variant="outline" className="mt-4" onClick={addRule}>
            <Plus className="mr-2 h-4 w-4" />
            Configurer la rétention
          </Button>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {filteredRules.map((rule) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <GlassCard className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold capitalize">
                      {rule.eventType.replace(/_/g, " ")}
                    </h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Retention period selector */}
                <div className="mb-4">
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    Durée de rétention
                  </label>
                  <Select
                    value={String(rule.retentionDays)}
                    onValueChange={(v) =>
                      updateRule(rule.id, { retentionDays: Number(v) })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RETENTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.days} value={String(opt.days)}>
                          <span className="font-medium">{opt.label}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            — {opt.desc}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Export before purge */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <label className="text-sm font-medium">
                      Exporter avant purge
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Générer un export avant la suppression automatique
                    </p>
                  </div>
                  <Switch
                    checked={rule.exportBeforePurge}
                    onCheckedChange={(v) =>
                      updateRule(rule.id, { exportBeforePurge: v })
                    }
                  />
                </div>

                {/* Export format */}
                {rule.exportBeforePurge && (
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-xs font-medium text-muted-foreground">
                      Format d&apos;export
                    </label>
                    <Select
                      value={rule.exportFormat}
                      onValueChange={(v) =>
                        updateRule(rule.id, { exportFormat: v as ExportFormat })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          ))}

          {/* Add rule button */}
          <Button variant="outline" className="w-full" onClick={addRule}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une règle
          </Button>
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sauvegarde en cours...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
