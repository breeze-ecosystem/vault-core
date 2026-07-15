"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { updateUser, changePassword, getLicenseStatus, getLicenseUsage } from "@/lib/api";
import { LicenseStatusBadge } from "@/components/license-status-badge";
import { LicenseUsageBars } from "@/components/license-usage-bars";
import { LicenseExpiryCountdown } from "@/components/license-expiry-countdown";

export default function ParametresPage() {
  const { user } = useAuth();
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
    <div>
      <PageHeader title="Paramètres" description="Configuration de votre compte" />

      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profil</CardTitle>
          </CardHeader>
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
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Nom</label>
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Changer le mot de passe</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Mot de passe actuel</label>
                <input
                  type="password"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Entrez votre mot de passe actuel"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le nouveau mot de passe"
                />
              </div>
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? "Modification..." : "Changer le mot de passe"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations système</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Environnement</span>
              <span>Production</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">API</span>
              <span className="truncate max-w-[200px] sm:max-w-none">{process.env.NEXT_PUBLIC_API_URL ?? window.location.origin}</span>
            </div>
          </CardContent>
        </Card>

        {licenseStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Licence</CardTitle>
            </CardHeader>
            <CardContent>
              <LicenseStatusBadge state={licenseStatus.licenseState} />
              <div className="mt-2">
                <LicenseExpiryCountdown
                  state={licenseStatus.licenseState}
                  expiresAt={licenseStatus.expiresAt}
                  graceEndsAt={licenseStatus.graceEndsAt}
                  trialEndsAt={licenseStatus.trialEndsAt}
                />
              </div>
              <div className="mt-4 space-y-3">
                <LicenseUsageBars
                  current={usage.cameras.current}
                  max={usage.cameras.max}
                  label="Caméras"
                />
                <LicenseUsageBars
                  current={usage.doors.current}
                  max={usage.doors.max}
                  label="Portes"
                />
              </div>
              {licenseStatus.licenseState === 'no_license' && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.location.href = '/licences/activation'}
                >
                  Activer une licence
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
