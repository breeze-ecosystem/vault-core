"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { DNDScheduleEditor } from "@/components/dnd-schedule-editor";
import {
  getDndSchedule,
  updateDndSchedule,
  type DndConfig,
} from "@/lib/api";

export default function NotificationSilencieusePage() {
  const [config, setConfig] = useState<DndConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      const data = await getDndSchedule();
      setConfig(data);
    } catch {
      // Optional
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async (data: Partial<DndConfig>) => {
    const updated = await updateDndSchedule(data);
    setConfig(updated);
  };

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Notifications silencieuses (DND)"
          description="Planifiez les plages horaires de silence"
        />
        <DNDScheduleEditor
          config={config}
          loading={loading}
          onSave={handleSave}
        />
      </div>
    </PageTransition>
  );
}
