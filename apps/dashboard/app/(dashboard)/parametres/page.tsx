"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { updateUser, changePassword, getLicenseStatus, getLicenseUsage } from "@/lib/api";
import { LicenseStatusBadge } from "@/components/license-status-badge";
import { LicenseUsageBars } from "@/components/license-usage-bars";
import { LicenseExpiryCountdown } from "@/components/license-expiry-countdown";
import { SsoConfigForm } from "@/components/sso/SsoConfigForm";
import { ApiKeyTable } from "@/components/api-keys/ApiKeyTable";
import { ApiKeyCreateForm } from "@/components/api-keys/ApiKeyCreateForm";
import { WebhookSubscriptionForm } from "@/components/webhooks/WebhookSubscriptionForm";
import { WebhookDeliveryTimeline } from "@/components/webhooks/WebhookDeliveryTimeline";
import { ComplianceReportSelector } from "@/components/compliance/ComplianceReportSelector";
import { BrandingPreviewCard } from "@/components/branding/BrandingPreviewCard";
import { ColorPicker } from "@/components/branding/ColorPicker";
import { LogoUploader } from "@/components/branding/LogoUploader";
import {
  fetchApiKeys,
  revokeApiKey,
  createApiKey,
  fetchWebhookSubscriptions,
  createWebhookSubscription,
  fetchOrganizationBranding,
  updateOrganizationBranding,
  type ApiKey,
  type WebhookSubscription,
  type OrganizationBranding,
} from "@/lib/api";

type Tab = "profil" | "sso" | "api-keys" | "webhooks" | "branding";

export default function ParametresPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profil");

  const tabs: { id: Tab; label: string }[] = [
    { id: "profil", label: "Profil" },
    { id: "sso", label: "SSO" },
    { id: "api-keys", label: "API Keys" },
    { id: "webhooks", label: "Webhooks" },
    { id: "branding", label: "Image de marque" },
  ];

  return (
    <div>
      <PageHeader title="Paramètres" description="Configuration de votre organisation" />

      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex gap-1 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "profil" && <ProfileTab user={user} />}
        {activeTab === "sso" && <SsoConfigForm />}
        {activeTab === "api-keys" && <ApiKeysTab />}
        {activeTab === "webhooks" && <WebhooksTab />}
        {activeTab === "branding" && <BrandingTab />}
      </div>
    </div>
  );
}

function ProfileTab({ user }: { user: any }) {
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [usage, setUsage] = useState<any>({ cameras: { current: 0, max: null }, doors: { current: 0, max: null } });

  useEffect(() => {
    getLicenseStatus().then(setLicenseStatus).catch(() => {});
    getLicenseUsage().then(setUsage).catch(() => {});
  }, []);

  if (!user) return null;

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateUser(user.id, { firstName, lastName });
      toast("Profil mis à jour", "success");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (newPassword.length < 8) {
      toast("Le nouveau mot de passe doit contenir au moins 8 caractères", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("Les mots de passe ne correspondent pas", "error");
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(user.id, currentPassword, newPassword);
      toast("Mot de passe modifié avec succès", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">Profil</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{user.firstName} {user.lastName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-primary">{user.role}</p>
            </div>
          </div>
          <Separator className="mb-6" />
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Prénom</label>
                <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Nom</label>
                <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Changer le mot de passe</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Mot de passe actuel</label>
              <input type="password" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Entrez votre mot de passe actuel" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Nouveau mot de passe</label>
              <input type="password" required minLength={8} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 8 caractères" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Confirmer le nouveau mot de passe</label>
              <input type="password" required minLength={8} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Répétez le nouveau mot de passe" />
            </div>
            <Button type="submit" disabled={changingPassword}>{changingPassword ? "Modification..." : "Changer le mot de passe"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Informations système</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Version</span><span>1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Environnement</span><span>Production</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">API</span>
            <span className="truncate max-w-[200px] sm:max-w-none">{process.env.NEXT_PUBLIC_API_URL ?? window.location.origin}</span>
          </div>
        </CardContent>
      </Card>

      {licenseStatus && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Licence</CardTitle></CardHeader>
          <CardContent>
            <LicenseStatusBadge state={licenseStatus.licenseState} />
            <div className="mt-2">
              <LicenseExpiryCountdown state={licenseStatus.licenseState} expiresAt={licenseStatus.expiresAt} graceEndsAt={licenseStatus.graceEndsAt} />
            </div>
            <div className="mt-4 space-y-3">
              <LicenseUsageBars current={usage.cameras.current} max={usage.cameras.max} label="Caméras" />
              <LicenseUsageBars current={usage.doors.current} max={usage.doors.max} label="Portes" />
            </div>
            {licenseStatus.licenseState === 'no_license' && (
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/licences/activation'}>
                Activer une licence
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => { loadKeys(); }, []);

  async function loadKeys() {
    setLoading(true);
    try {
      const data = await fetchApiKeys();
      setKeys(data);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeApiKey(id);
      toast("Clé API révoquée", "success");
      loadKeys();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setShowCreate(true); setCreatedKey(null); }}>Nouvelle clé API</Button>
      </div>
      {createdKey && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <p className="mb-2 text-sm font-medium text-amber-500">Clé API créée</p>
            <p className="mb-2 text-sm text-muted-foreground">Copiez cette clé maintenant — elle ne sera plus affichée.</p>
            <code className="block rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">{createdKey}</code>
          </CardContent>
        </Card>
      )}
      {showCreate && (
        <ApiKeyCreateForm
          onCreated={(key) => { setShowCreate(false); setCreatedKey(key); loadKeys(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}
      <Card>
        <CardHeader><CardTitle className="text-lg">Clés API actives</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <ApiKeyTable keys={keys} onRevoke={handleRevoke} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WebhooksTab() {
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);

  useEffect(() => { loadSubscriptions(); }, []);

  async function loadSubscriptions() {
    setLoading(true);
    try {
      const data = await fetchWebhookSubscriptions();
      setSubscriptions(data);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>Nouvel abonnement</Button>
      </div>
      {showCreate && (
        <WebhookSubscriptionForm
          onCreated={() => { setShowCreate(false); loadSubscriptions(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}
      <Card>
        <CardHeader><CardTitle className="text-lg">Abonnements</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun abonnement webhook configuré.</p>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{sub.eventType}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-md">{sub.targetUrl}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sub.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                        {sub.isActive ? "Actif" : "Inactif"}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setSelectedSub(selectedSub === sub.id ? null : sub.id)}>
                        {selectedSub === sub.id ? "Masquer" : "Livraisons"}
                      </Button>
                    </div>
                  </div>
                  {selectedSub === sub.id && (
                    <div className="mt-4">
                      <WebhookDeliveryTimeline subscriptionId={sub.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BrandingTab() {
  const [branding, setBranding] = useState<OrganizationBranding>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOrganizationBranding().then(setBranding).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await updateOrganizationBranding(branding);
      toast("Image de marque mise à jour", "success");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">Image de marque</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Nom d'affichage</label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={branding.displayName || ""}
              onChange={(e) => setBranding((prev) => ({ ...prev, displayName: e.target.value }))}
              placeholder="OVERSIGHT AI"
            />
          </div>

          <LogoUploader
            currentLogoUrl={branding.logoUrl}
            onLogoChange={(url) => setBranding((prev) => ({ ...prev, logoUrl: url }))}
          />

          <ColorPicker
            label="Couleur principale"
            value={branding.primaryColor || "#06b6d4"}
            onChange={(color) => setBranding((prev) => ({ ...prev, primaryColor: color }))}
          />

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Aperçu</h3>
        <BrandingPreviewCard branding={branding} />
      </div>
    </div>
  );
}
