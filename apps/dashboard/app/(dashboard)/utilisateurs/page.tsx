"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { hasMinRole } from "@repo/shared";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/table";
import {
  fetchUsers,
  updateUser,
  createUser,
  deleteUser,
  createInvite,
  inviteBySms,
  type DashboardUser,
} from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { ShieldX, Plus, Trash2, Mail, MessageSquare, UserPlus, Crown, AlertTriangle } from "lucide-react";

const roleVariant: Record<string, "default" | "secondary" | "destructive" | "warning" | "success"> = {
  SUPER_ADMIN: "destructive",
  ADMIN: "warning",
  SUPERVISOR: "default",
  OPERATOR: "secondary",
  VIEWER: "secondary",
};

const ROLES = ["VIEWER", "OPERATOR", "SUPERVISOR", "ADMIN"] as const;

interface UserForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

const emptyForm: UserForm = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "VIEWER",
};

export default function UtilisateursPage() {
  const { user, isLoading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<UserForm>({ ...emptyForm });
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<"email" | "sms" | "manual">("email");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [inviting, setInviting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !hasMinRole(user.role as any, "ADMIN")) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Accès refusé</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Vous n&apos;avez pas les permissions nécessaires
        </p>
      </div>
    );
  }

  function resetForm() {
    setForm({ ...emptyForm });
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createUser({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
      });
      toast("Utilisateur créé", "success");
      resetForm();
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function toggleActive(u: DashboardUser) {
    try {
      await updateUser(u.id, { isActive: !u.isActive });
      toast(u.isActive ? "Utilisateur désactivé" : "Utilisateur activé", "success");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function changeRole(u: DashboardUser, role: string) {
    try {
      await updateUser(u.id, { role });
      toast(`Rôle changé en ${role}`, "success");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function handleDelete(u: DashboardUser) {
    if (!confirm(`Supprimer l'utilisateur ${u.firstName} ${u.lastName} ?`)) return;
    try {
      await deleteUser(u.id);
      toast("Utilisateur supprimé", "success");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        description="Gestion des comptes utilisateurs"
        action={{
          label: "Inviter",
          icon: Plus,
          onClick: () => {
            setInviteEmail("");
            setInvitePhone("");
            setInviteRole("VIEWER");
            setInviteMethod("email");
            setShowInviteDialog(true);
          },
        }}
      />

      {/* VISION limit banner */}
      <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <div className="flex items-start gap-3">
          <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              Pack VISION — Limite de 3 utilisateurs secondaires
            </p>
            <p className="mt-0.5 text-xs text-amber-400/70">
              Passez à BASTION pour débloquer des utilisateurs illimités et des fonctionnalités avancées.
            </p>
          </div>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-lg border border-border bg-card p-4"
        >
          <h3 className="mb-3 font-semibold">Nouvel utilisateur</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Email</label>
              <input
                type="email"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">
                Mot de passe
              </label>
              <input
                type="password"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Prénom</label>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Nom</label>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Rôle</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit">Créer</Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Annuler
            </Button>
          </div>
        </form>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter un utilisateur</DialogTitle>
            <DialogDescription>
              Choisissez la méthode d&apos;invitation pour ce nouvel utilisateur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Invite method selector */}
            <div className="flex gap-2">
              <Button
                variant={inviteMethod === "email" ? "default" : "outline"}
                size="sm"
                onClick={() => setInviteMethod("email")}
              >
                <Mail className="mr-1.5 h-4 w-4" />
                Email
              </Button>
              <Button
                variant={inviteMethod === "sms" ? "default" : "outline"}
                size="sm"
                onClick={() => setInviteMethod("sms")}
              >
                <MessageSquare className="mr-1.5 h-4 w-4" />
                SMS
              </Button>
              <Button
                variant={inviteMethod === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setInviteMethod("manual")}
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Manuel
              </Button>
            </div>

            {inviteMethod === "email" && (
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Adresse email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="utilisateur@exemple.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}

            {inviteMethod === "sms" && (
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Numéro de téléphone</label>
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+227 XX XX XX XX"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}

            {/* Role selector */}
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Rôle</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="VIEWER">Viewer — Accès live et chronologie uniquement</option>
                <option value="ADMIN">Admin — Accès complet à la configuration</option>
              </select>
            </div>

            {/* Limit info */}
            <div className="flex items-start gap-2 rounded-lg bg-muted/30 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs text-muted-foreground">
                Pack VISION : maximum 3 utilisateurs secondaires. Les utilisateurs existants avec des rôles supérieurs (SUPER_ADMIN, etc.) ne sont pas comptés dans cette limite.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={async () => {
                setInviting(true);
                try {
                  const orgId = user?.organizationId;
                  if (!orgId) throw new Error("Organisation non trouvée");

                  if (inviteMethod === "email") {
                    await createInvite(orgId, { email: inviteEmail, role: inviteRole });
                    toast("Invitation envoyée par email", "success");
                  } else if (inviteMethod === "sms") {
                    await inviteBySms(orgId, { phone: invitePhone, role: inviteRole });
                    toast("Invitation envoyée par SMS", "success");
                  } else {
                    resetForm();
                    setShowForm(true);
                  }
                  setShowInviteDialog(false);
                  setRefreshKey((k) => k + 1);
                } catch (e: any) {
                  toast(e.message, "error");
                } finally {
                  setInviting(false);
                }
              }}
              disabled={inviting}
            >
              {inviting ? "Envoi..." : "Inviter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DataTable
        key={refreshKey}
        columns={[
          {
            key: "name",
            label: "Nom",
            render: (u: DashboardUser) => (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {u.firstName.charAt(0)}
                  {u.lastName.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>
            ),
          },
          {
            key: "role",
            label: "Rôle",
            render: (u: DashboardUser) => (
              <Badge variant={roleVariant[u.role] ?? "secondary"}>
                {u.role}
              </Badge>
            ),
          },
          {
            key: "isActive",
            label: "Statut",
            render: (u: DashboardUser) => (
              <Badge variant={u.isActive ? "success" : "destructive"}>
                {u.isActive ? "Actif" : "Inactif"}
              </Badge>
            ),
          },
          {
            key: "createdAt",
            label: "Inscrit le",
            render: (u: DashboardUser) =>
              new Date(u.createdAt).toLocaleDateString("fr-FR"),
          },
          {
            key: "actions",
            label: "",
            render: (u: DashboardUser) => (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                {hasMinRole(user.role as any, "ADMIN") && u.id !== user.id && (
                  <>
                    <select
                      className="rounded border border-input bg-background px-2 py-1 text-xs"
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant={u.isActive ? "outline" : "default"}
                      onClick={() => toggleActive(u)}
                    >
                      {u.isActive ? "Désactiver" : "Activer"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(u)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ),
          },
        ]}
        fetchFn={fetchUsers}
      />
    </div>
  );
}
