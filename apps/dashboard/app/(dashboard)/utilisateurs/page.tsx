"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { hasMinRole } from "@repo/shared";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import {
  fetchUsers,
  updateUser,
  createUser,
  deleteUser,
  type DashboardUser,
} from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { ShieldX, Plus, Trash2 } from "lucide-react";

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
          label: "Ajouter",
          icon: Plus,
          onClick: () => {
            resetForm();
            setShowForm(true);
          },
        }}
      />

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
