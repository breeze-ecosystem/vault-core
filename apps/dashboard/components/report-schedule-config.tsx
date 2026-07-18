"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, Mail, Save } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { itemVariants } from "@/components/page-transition";
import { toast } from "@/components/ui/toast";

interface ReportSchedule {
  type: "weekly" | "monthly";
  format: "pdf";
  recipients: string;
  enabled: boolean;
}

interface ReportScheduleConfigProps {
  schedule: ReportSchedule | null;
  onSave: (config: ReportSchedule) => Promise<void>;
  loading?: boolean;
}

export function ReportScheduleConfig({
  schedule,
  onSave,
  loading = false,
}: ReportScheduleConfigProps) {
  const [type, setType] = useState<"weekly" | "monthly">(
    schedule?.type || "weekly",
  );
  const [format] = useState<"pdf">("pdf");
  const [recipients, setRecipients] = useState<string>(
    schedule?.recipients || "",
  );
  const [enabled, setEnabled] = useState<boolean>(schedule?.enabled || false);
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5">
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-32" />
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  const validateEmailInput = (value: string): boolean => {
    if (!value.trim()) return false;
    const emails = value.split(",").map((e) => e.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.every((email) => emailRegex.test(email));
  };

  const handleSave = async () => {
    if (recipients.trim() && !validateEmailInput(recipients)) {
      toast.error("Format d'email invalide. Séparez les emails par des virgules.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        type,
        format,
        recipients: recipients.trim(),
        enabled,
      });
      toast.success("Planification des rapports enregistrée");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <GlassCard className="p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Calendar className="h-4 w-4 text-primary" />
          Planification des rapports
        </h3>

        <div className="space-y-4">
          {/* Type de rapport */}
          <div className="space-y-2">
            <Label htmlFor="report-type">Type de rapport</Label>
            <select
              id="report-type"
              value={type}
              onChange={(e) => setType(e.target.value as "weekly" | "monthly")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuel</option>
            </select>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label htmlFor="report-format">Format</Label>
            <select
              id="report-format"
              value={format}
              disabled
              className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground ring-offset-background"
            >
              <option value="pdf">PDF</option>
            </select>
          </div>

          {/* Destinataires */}
          <div className="space-y-2">
            <Label htmlFor="recipients">
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Destinataires
              </div>
            </Label>
            <Input
              id="recipients"
              placeholder="email1@example.com, email2@example.com"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Séparez les adresses email par des virgules
            </p>
          </div>

          {/* Activer la planification */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Activer la planification</p>
                <p className="text-xs text-muted-foreground">
                  {type === "weekly"
                    ? "Rapport envoyé chaque lundi"
                    : "Rapport envoyé le 1er du mois"}
                </p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
