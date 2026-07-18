"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import {
  Bell,
  MessageSquare,
  Smartphone,
  QrCode,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Send,
  AlertTriangle,
} from "lucide-react";
import type { AlertChannelConfig as AlertChannelConfigType } from "@/lib/api";

interface AlertChannelConfigProps {
  config: AlertChannelConfigType | null;
  loading: boolean;
  onSave: (data: Partial<AlertChannelConfigType>) => Promise<void>;
  onTestWhatsApp: () => Promise<void>;
  onTestSms: () => Promise<void>;
}

export function AlertChannelConfig({
  config,
  loading,
  onSave,
  onTestWhatsApp,
  onTestSms,
}: AlertChannelConfigProps) {
  const [pushEnabled, setPushEnabled] = useState(config?.pushEnabled ?? true);
  const [smsEnabled, setSmsEnabled] = useState(config?.smsEnabled ?? false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(config?.whatsappEnabled ?? false);
  const [cloudFallback, setCloudFallback] = useState(config?.cloudFallbackEnabled ?? false);
  const [alertTypes, setAlertTypes] = useState<("motion" | "face" | "all")[]>(
    config?.alertTypes ?? ["all"],
  );
  const [saving, setSaving] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <GlassCard key={i} className="p-6">
            <Skeleton className="mb-4 h-5 w-48" />
            <Skeleton className="h-10 w-full" />
          </GlassCard>
        ))}
      </div>
    );
  }

  function toggleAlertType(type: "motion" | "face" | "all") {
    if (type === "all") {
      setAlertTypes(["all"]);
    } else {
      const withoutAll = alertTypes.filter((t) => t !== "all");
      if (withoutAll.includes(type)) {
        setAlertTypes(withoutAll.filter((t) => t !== type));
        if (withoutAll.length <= 1) setAlertTypes(["all"]);
      } else {
        setAlertTypes([...withoutAll, type]);
      }
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        pushEnabled,
        smsEnabled,
        whatsappEnabled,
        cloudFallbackEnabled: cloudFallback,
        alertTypes,
      });
      toast("Configuration des canaux d'alerte enregistrée", "success");
    } catch (err: any) {
      toast(err.message || "Erreur", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSms() {
    setTestingSms(true);
    try {
      await onTestSms();
      toast("Test SMS envoyé avec succès", "success");
    } catch (err: any) {
      toast(err.message || "Erreur d'envoi SMS", "error");
    } finally {
      setTestingSms(false);
    }
  }

  async function handleTestWhatsapp() {
    setTestingWhatsapp(true);
    try {
      await onTestWhatsapp();
      toast("Test WhatsApp envoyé avec succès", "success");
    } catch (err: any) {
      toast(err.message || "Erreur d'envoi WhatsApp", "error");
    } finally {
      setTestingWhatsapp(false);
    }
  }

  const channelCard = (
    icon: React.ReactNode,
    title: string,
    description: string,
    enabled: boolean,
    onToggle: () => void,
    children?: React.ReactNode,
  ) => (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            enabled ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
              enabled && "translate-x-5",
            )}
          />
        </button>
      </div>
      {enabled && children}
    </GlassCard>
  );

  return (
    <div className="space-y-6">
      {/* Push channel */}
      {channelCard(
        <Bell className="h-5 w-5 text-primary" />,
        "Notifications Push",
        "Notifications sur l'application mobile",
        pushEnabled,
        () => setPushEnabled(!pushEnabled),
      )}

      {/* SMS channel */}
      {channelCard(
        <MessageSquare className="h-5 w-5 text-primary" />,
        "SMS",
        "Alertes par SMS via modem GSM",
        smsEnabled,
        () => setSmsEnabled(!smsEnabled),
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {config?.modemConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-400" />
                <Badge variant="success">Modem connecté</Badge>
                {config.modemPhoneNumber && (
                  <span className="text-sm text-muted-foreground">
                    {config.modemPhoneNumber}
                  </span>
                )}
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-destructive" />
                <Badge variant="destructive">Modem non détecté</Badge>
              </>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">
              Utiliser une passerelle cloud si le modem est hors ligne
            </label>
            <button
              onClick={() => setCloudFallback(!cloudFallback)}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                cloudFallback ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                  cloudFallback && "translate-x-5",
                )}
              />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestSms}
            disabled={testingSms}
          >
            {testingSms ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Envoi du test...
              </>
            ) : (
              <>
                <Send className="mr-1.5 h-4 w-4" />
                Tester SMS
              </>
            )}
          </Button>
        </div>,
      )}

      {/* WhatsApp channel */}
      {channelCard(
        <Smartphone className="h-5 w-5 text-primary" />,
        "WhatsApp",
        "Alertes avec capture d'écran via WhatsApp",
        whatsappEnabled,
        () => setWhatsappEnabled(!whatsappEnabled),
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {config?.whatsappConnected ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <Badge variant="success">Connecté</Badge>
                {config.whatsappDeviceName && (
                  <span className="text-sm text-muted-foreground">
                    {config.whatsappDeviceName}
                  </span>
                )}
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-destructive" />
                <Badge variant="destructive">Déconnecté</Badge>
              </>
            )}
          </div>

          {!config?.whatsappConnected && config?.whatsappQrCodeUrl && (
            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">
                  Scannez avec WhatsApp pour connecter
                </span>
              </div>
              <div className="mb-3 flex justify-center">
                <img
                  src={config.whatsappQrCodeUrl}
                  alt="WhatsApp QR Code"
                  className="h-40 w-40 rounded-lg"
                />
              </div>
              <ol className="space-y-1 text-xs text-muted-foreground">
                <li>1. Ouvrez WhatsApp sur votre téléphone</li>
                <li>2. Menu → Appareils liés → Scanner le code</li>
                <li>3. Pointez votre appareil vers ce QR code</li>
              </ol>
            </div>
          )}

          {config?.whatsappConnected && (
            <p className="text-xs text-muted-foreground">
              Les alertes sont envoyées avec une capture d&apos;écran de l&apos;événement.
            </p>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestWhatsapp}
            disabled={testingWhatsapp}
          >
            {testingWhatsapp ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Envoi du test...
              </>
            ) : (
              <>
                <Send className="mr-1.5 h-4 w-4" />
                Tester WhatsApp
              </>
            )}
          </Button>
        </div>,
      )}

      {/* Alert types */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Types d&apos;alertes à envoyer</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "motion", "face"] as const).map((type) => {
            const active = alertTypes.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleAlertType(type)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm transition-all",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent/50",
                )}
              >
                {type === "all" ? "Tous" : type === "motion" ? "Mouvement" : "Visage"}
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Save */}
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
