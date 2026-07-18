"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import {
  getRecordingConfig,
  updateRecordingConfig,
  type RecordingConfig,
} from "@/lib/api";
import { RecordingSettingsForm } from "@/components/recording-settings-form";

export default function EnregistrementPage() {
  const [config, setConfig] = useState<RecordingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      const data = await getRecordingConfig();
      setConfig(data);
    } catch {
      // Config fetch failed — component handles null
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async (data: Partial<RecordingConfig>) => {
    const updated = await updateRecordingConfig(data);
    setConfig(updated);
  };

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Enregistrement"
          description="Configuration de l'enregistrement vidéo"
        />
        <RecordingSettingsForm
          config={config}
          loading={loading}
          onSave={handleSave}
        />
      </div>
    </PageTransition>
  );
}
