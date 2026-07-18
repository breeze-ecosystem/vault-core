"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { AlertChannelConfig } from "@/components/alert-channel-config";
import {
  getAlertChannelConfig,
  updateAlertChannelConfig,
  sendTestWhatsApp,
  sendTestSms,
  type AlertChannelConfig as AlertChannelConfigType,
} from "@/lib/api";

export default function AlertesPage() {
  const [config, setConfig] = useState<AlertChannelConfigType | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      const data = await getAlertChannelConfig();
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

  const handleSave = async (data: Partial<AlertChannelConfigType>) => {
    const updated = await updateAlertChannelConfig(data);
    setConfig(updated);
  };

  const handleTestWhatsApp = async () => {
    await sendTestWhatsApp();
  };

  const handleTestSms = async () => {
    await sendTestSms();
  };

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Canaux d'alerte"
          description="Configurez les canaux de notification pour les alertes"
        />
        <AlertChannelConfig
          config={config}
          loading={loading}
          onSave={handleSave}
          onTestWhatsApp={handleTestWhatsApp}
          onTestSms={handleTestSms}
        />
      </div>
    </PageTransition>
  );
}
