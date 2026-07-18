"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { GeofencingSettings } from "@/components/geofencing-settings";
import { GeofencingStatusBar } from "@/components/geofencing-status-bar";
import {
  getGeofencingStatus,
  getGeofencingConfig,
  updateGeofencingConfig,
  forceArm,
  forceDisarm,
  type GeofencingStatus,
  type GeofencingConfig,
} from "@/lib/api";

export default function AbsencePage() {
  const [status, setStatus] = useState<GeofencingStatus | null>(null);
  const [config, setConfig] = useState<GeofencingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        getGeofencingStatus(),
        getGeofencingConfig(),
      ]);
      setStatus(s);
      setConfig(c);
    } catch {
      // Optional
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveConfig = async (data: Partial<GeofencingConfig>) => {
    const updated = await updateGeofencingConfig(data);
    setConfig(updated);
  };

  const handleForceArm = async () => {
    await forceArm();
    const s = await getGeofencingStatus();
    setStatus(s);
  };

  const handleForceDisarm = async () => {
    await forceDisarm();
    const s = await getGeofencingStatus();
    setStatus(s);
  };

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Mode Absence"
          description="Géolocalisation et armement automatique"
        />

        {status && (
          <div className="mb-6">
            <GeofencingStatusBar
              armed={status.armed}
              connectedPhones={status.connectedPhones}
              armDelayMinutes={status.armDelayMinutes}
            />
          </div>
        )}

        <GeofencingSettings
          status={status}
          config={config}
          loading={loading}
          onSaveConfig={handleSaveConfig}
          onForceArm={handleForceArm}
          onForceDisarm={handleForceDisarm}
        />
      </div>
    </PageTransition>
  );
}
