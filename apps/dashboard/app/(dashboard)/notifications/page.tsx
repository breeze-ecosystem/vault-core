"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getNotificationSettings,
  updateNotificationSettings,
  getNotificationLogs,
  sendTestNotification,
  type NotificationSetting,
  type NotificationLog,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "📧 Email",
  WEBHOOK: "🔗 Webhook",
  IN_APP: "🔔 In-App",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  SENT: "bg-green-500/10 text-green-600 border-green-500/20",
  FAILED: "bg-red-500/10 text-red-600 border-red-500/20",
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500/10 text-red-600 border-red-500/20",
  HIGH: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  LOW: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  INFO: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [logs, setLogs] = useState<{ data: NotificationLog[]; total: number }>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [inAppEnabled, setInAppEnabled] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([getNotificationSettings(), getNotificationLogs({ limit: 20 })]);
      setSettings(s);
      setLogs(l);

      const emailSetting = s.find((x) => x.channel === "EMAIL");
      setEmailEnabled(emailSetting?.enabled ?? false);
      setEmailAddress((emailSetting?.config as Record<string, string>)?.email ?? "");

      const webhookSetting = s.find((x) => x.channel === "WEBHOOK");
      setWebhookEnabled(webhookSetting?.enabled ?? false);
      setWebhookUrl((webhookSetting?.config as Record<string, string>)?.url ?? "");

      const inAppSetting = s.find((x) => x.channel === "IN_APP");
      setInAppEnabled(inAppSetting?.enabled ?? true);
    } catch {
      setSettings([]);
      setLogs({ data: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationSettings([
        { channel: "EMAIL", enabled: emailEnabled, config: { email: emailAddress || undefined } },
        { channel: "WEBHOOK", enabled: webhookEnabled, config: { url: webhookUrl || undefined } },
        { channel: "IN_APP", enabled: inAppEnabled },
      ]);
      await loadData();
    } catch {
      // Save failure handled via loadData — data stays stale, user can retry
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await sendTestNotification();
      setTestResult(result.message);
    } catch (err: unknown) {
      setTestResult("Erreur: " + ((err as Error).message ?? "Échec"));
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm">Configurez vos canaux de notification</p>
        </div>
        <Button onClick={handleTest} disabled={testing} variant="outline">
          {testing ? "Envoi en cours..." : "📧 Envoyer un email test"}
        </Button>
      </div>

      {testResult && (
        <Card className={testResult.startsWith("Erreur") ? "border-red-500/50" : "border-green-500/50"}>
          <CardContent className="p-4">
            <p className={`text-sm ${testResult.startsWith("Erreur") ? "text-red-600" : "text-green-600"}`}>
              {testResult}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Email */}
        <Card className={emailEnabled ? "border-primary/50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">📧 Email</CardTitle>
              <button
                onClick={() => setEmailEnabled(!emailEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  emailEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <CardDescription>Alertes par email via Resend</CardDescription>
          </CardHeader>
          {emailEnabled && (
            <CardContent>
              <div>
                <Label htmlFor="email" className="text-xs">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Laissez vide pour utiliser votre email de connexion
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Webhook */}
        <Card className={webhookEnabled ? "border-primary/50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">🔗 Webhook</CardTitle>
              <button
                onClick={() => setWebhookEnabled(!webhookEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  webhookEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    webhookEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <CardDescription>POST HTTP vers votre endpoint</CardDescription>
          </CardHeader>
          {webhookEnabled && (
            <CardContent>
              <div>
                <Label htmlFor="webhookUrl" className="text-xs">URL du webhook</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  placeholder="https://hooks.example.com/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* In-App */}
        <Card className={inAppEnabled ? "border-primary/50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">🔔 In-App</CardTitle>
              <button
                onClick={() => setInAppEnabled(!inAppEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  inAppEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    inAppEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <CardDescription>Notifications dans le dashboard</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Sauvegarde..." : "💾 Sauvegarder les paramètres"}
        </Button>
      </div>

      <Separator />

      {/* Logs */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Historique des notifications</h2>
        {logs.data.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Aucune notification envoyée pour le moment
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Alerte</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Canal</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Destinataire</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.data.map((log) => (
                      <tr key={log.id} className="border-b border-border last:border-0">
                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={SEVERITY_COLORS[log.alert.severity] ?? ""}>
                              {log.alert.severity}
                            </Badge>
                            <span className="text-sm truncate max-w-[150px]">{log.alert.title}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm">{CHANNEL_LABELS[log.channel] ?? log.channel}</td>
                        <td className="p-3 text-xs text-muted-foreground max-w-[180px] truncate">
                          {log.recipient}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={STATUS_COLORS[log.status] ?? ""}>
                            {log.status}
                          </Badge>
                          {log.error && (
                            <p className="text-xs text-red-500 mt-1 truncate max-w-[150px]" title={log.error}>
                              {log.error}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logs.total > 20 && (
                <div className="p-3 text-center text-sm text-muted-foreground border-t border-border">
                  {logs.total} notifications au total
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
