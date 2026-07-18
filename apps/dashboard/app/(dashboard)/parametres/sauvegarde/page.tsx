"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { GlassCard } from "@/components/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  getBackupConfig,
  saveBackupConfig,
  testBackupConnection,
  runManualBackup,
  getBackupJobs,
  type BackupConfigDto,
  type BackupJobDto,
} from "@/lib/api";
import { BackupConfigForm } from "@/components/backup-config-form";
import { BackupStatusCard } from "@/components/backup-status-card";

export default function SauvegardePage() {
  const [config, setConfig] = useState<BackupConfigDto | null>(null);
  const [latestJob, setLatestJob] = useState<BackupJobDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [configData, jobsData] = await Promise.all([
        getBackupConfig(),
        getBackupJobs(1, 1),
      ]);
      setConfig(configData);
      setLatestJob(jobsData.data[0] || null);
    } catch (err: any) {
      setError(err.message || "Échec du chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (input: { targetPath: string; username?: string; password?: string; schedule?: string }) => {
    const updated = await saveBackupConfig(input);
    setConfig(updated);
    // Reload jobs after config change
    const jobsData = await getBackupJobs(1, 1);
    setLatestJob(jobsData.data[0] || null);
  };

  const handleTestConnection = async (
    input: { targetPath: string; username?: string; password?: string },
  ): Promise<{ success: boolean; message: string }> => {
    return testBackupConnection({
      targetPath: input.targetPath,
      username: input.username,
      password: input.password,
    });
  };

  const handleRunBackup = async () => {
    const result = await runManualBackup();
    // Poll for job completion
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const jobsData = await getBackupJobs(1, 1);
    setLatestJob(jobsData.data[0] || null);
  };

  // Loading state
  if (loading) {
    return (
      <PageTransition>
        <div>
          <PageHeader
            title="Sauvegarde"
            description="Configuration de la sauvegarde automatique vers un NAS"
          />
          <div className="space-y-4">
            <GlassCard className="p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </GlassCard>
            {[1, 2, 3].map((i) => (
              <GlassCard key={i} className="p-6">
                <Skeleton className="mb-3 h-5 w-40" />
                <Skeleton className="h-10 w-full" />
              </GlassCard>
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }

  // Error state
  if (error) {
    return (
      <PageTransition>
        <div>
          <PageHeader
            title="Sauvegarde"
            description="Configuration de la sauvegarde automatique vers un NAS"
          />
          <GlassCard className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
            <p className="text-base font-medium">Échec du chargement</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4" onClick={loadData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </GlassCard>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Sauvegarde"
          description="Configuration de la sauvegarde automatique vers un NAS"
        />
        <div className="space-y-6">
          <BackupStatusCard
            status={latestJob}
            nextBackupAt={config?.lastBackupAt || null}
            loading={false}
            onRetry={loadData}
          />
          <BackupConfigForm
            config={config}
            onSave={handleSave}
            onTest={handleTestConnection}
            onRunBackup={handleRunBackup}
          />
        </div>
      </div>
    </PageTransition>
  );
}
