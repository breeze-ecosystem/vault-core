"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Server,
  HardDrive,
  Wifi,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { BackupConfigDto } from "@/lib/api";

interface BackupConfigInput {
  targetPath: string;
  username?: string;
  password?: string;
  schedule?: string;
}

interface BackupConfigFormProps {
  config: BackupConfigDto | null;
  onSave: (config: BackupConfigInput) => Promise<void>;
  onTest: (config: BackupConfigInput) => Promise<{ success: boolean; message: string }>;
  onRunBackup: () => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export function BackupConfigForm({
  config,
  onSave,
  onTest,
  onRunBackup,
  loading = false,
  error: formError,
}: BackupConfigFormProps) {
  const [targetPath, setTargetPath] = useState(config?.targetPath || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [schedule, setSchedule] = useState(config?.schedule || "daily");
  const [enabled, setEnabled] = useState(config?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [running, setRunning] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Update form when config changes
  useEffect(() => {
    if (config) {
      setTargetPath(config.targetPath || "");
      setSchedule(config.schedule || "daily");
      setEnabled(config.enabled ?? true);
      // Password and username are not returned from API for security
    }
  }, [config]);

  const getCurrentInput = (): BackupConfigInput => ({
    targetPath,
    username: username || undefined,
    password: password || undefined,
    schedule,
  });

  const handleTest = async () => {
    if (!targetPath.trim()) {
      toast("Veuillez saisir un chemin NAS", "error");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(getCurrentInput());
      setTestResult(result);
      if (result.success) {
        toast("NAS accessible", "success");
      } else {
        toast(result.message || "Connexion impossible", "error");
      }
    } catch (err: any) {
      const msg = err.message || "Connexion impossible";
      setTestResult({ success: false, message: msg });
      toast(msg, "error");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!targetPath.trim()) {
      toast("Veuillez saisir un chemin NAS", "error");
      return;
    }
    setSaving(true);
    try {
      await onSave(getCurrentInput());
      toast("Configuration de sauvegarde enregistrée", "success");
    } catch (err: any) {
      toast(err.message || "Erreur lors de la sauvegarde", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRunBackup = async () => {
    setRunning(true);
    setBackupProgress(0);

    // Simulate progress during backup
    const progressInterval = setInterval(() => {
      setBackupProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 12;
      });
    }, 1000);

    try {
      await onRunBackup();
      clearInterval(progressInterval);
      setBackupProgress(100);
      setTimeout(() => {
        setRunning(false);
        setBackupProgress(0);
      }, 1500);
    } catch (err: any) {
      clearInterval(progressInterval);
      setRunning(false);
      setBackupProgress(0);
      toast(err.message || "Échec de la sauvegarde", "error");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <GlassCard key={i} className="p-6">
            <Skeleton className="mb-3 h-5 w-40" />
            <Skeleton className="h-10 w-full" />
          </GlassCard>
        ))}
      </div>
    );
  }

  // Error state
  if (formError) {
    return (
      <GlassCard className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
        <p className="text-base font-medium">Erreur de chargement</p>
        <p className="mt-1 text-sm text-muted-foreground">{formError}</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1 — Configuration NAS */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Configuration NAS</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetPath">Chemin NAS</Label>
            <Input
              id="targetPath"
              placeholder="//192.168.1.100/backup"
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Chemin réseau du partage NAS (ex: //192.168.1.100/sauvegardes)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d&apos;utilisateur (optionnel)</Label>
              <Input
                id="username"
                placeholder="Nom d'utilisateur NAS"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe (optionnel)</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mot de passe NAS"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Section 2 — Planification */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Planification</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schedule">Fréquence</Label>
            <Select value={schedule} onValueChange={setSchedule}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidienne</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium">
                Activer la sauvegarde
              </Label>
              <p className="text-xs text-muted-foreground">
                Sauvegardes automatiques selon la planification
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
      </GlassCard>

      {/* Section 3 — Actions */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wifi className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Actions</h3>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !targetPath.trim()}
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <Wifi className="mr-2 h-4 w-4" />
                Tester la connexion
              </>
            )}
          </Button>

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

          <Button
            variant="secondary"
            onClick={handleRunBackup}
            disabled={running || !targetPath.trim()}
          >
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sauvegarde en cours...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Lancer une sauvegarde
              </>
            )}
          </Button>
        </div>

        {/* Test connection result */}
        {testResult && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
              testResult.success
                ? "border-success/30 bg-success/5 text-success"
                : "border-destructive/30 bg-destructive/5 text-destructive"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Backup progress */}
        {running && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-medium">
                {Math.round(backupProgress)}%
              </span>
            </div>
            <Progress value={Math.round(backupProgress)} />
            <p className="text-xs text-muted-foreground">
              Sauvegarde en cours — {Math.round(backupProgress)}%
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
