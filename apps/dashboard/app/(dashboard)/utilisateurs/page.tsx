"use client";

import { useAuth } from "@/lib/auth-context";
import { hasMinRole } from "@repo/shared";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { fetchUsers, updateUser, type DashboardUser } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { ShieldX, Users } from "lucide-react";

const roleVariant: Record<string, "default" | "secondary" | "destructive" | "warning" | "success"> = {
  SUPER_ADMIN: "destructive",
  ADMIN: "warning",
  SUPERVISOR: "default",
  OPERATOR: "secondary",
  VIEWER: "secondary",
};

export default function UtilisateursPage() {
  const { user } = useAuth();

  if (!user || !hasMinRole(user.role as any, "ADMIN")) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Acces refuse</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Vous n&apos;avez pas les permissions necessaires
        </p>
      </div>
    );
  }

  async function toggleActive(u: DashboardUser) {
    try {
      await updateUser(u.id, { isActive: !u.isActive });
      toast(u.isActive ? "Utilisateur desactive" : "Utilisateur active", "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function changeRole(u: DashboardUser, role: string) {
    try {
      await updateUser(u.id, { role });
      toast(`Role change en ${role}`, "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <div>
      <PageHeader title="Utilisateurs" description="Gestion des comptes utilisateurs" />

      <DataTable
        columns={[
          { key: "name", label: "Nom", render: (u: DashboardUser) => (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {u.firstName.charAt(0)}{u.lastName.charAt(0)}
              </div>
              <div>
                <p className="font-medium">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
            </div>
          )},
          { key: "role", label: "Role", render: (u: DashboardUser) => (
            <Badge variant={roleVariant[u.role] ?? "secondary"}>{u.role}</Badge>
          )},
          { key: "isActive", label: "Statut", render: (u: DashboardUser) => (
            <Badge variant={u.isActive ? "success" : "destructive"}>{u.isActive ? "Actif" : "Inactif"}</Badge>
          )},
          { key: "createdAt", label: "Inscrit le", render: (u: DashboardUser) => new Date(u.createdAt).toLocaleDateString("fr-FR") },
          { key: "actions", label: "", render: (u: DashboardUser) => (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              {hasMinRole(user.role as any, "ADMIN") && u.id !== user.id && (
                <>
                  <select
                    className="rounded border border-input bg-background px-2 py-1 text-xs"
                    value={u.role}
                    onChange={(e) => changeRole(u, e.target.value)}
                  >
                    <option value="VIEWER">VIEWER</option>
                    <option value="OPERATOR">OPERATOR</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <Button size="sm" variant={u.isActive ? "outline" : "default"} onClick={() => toggleActive(u)}>
                    {u.isActive ? "Desactiver" : "Activer"}
                  </Button>
                </>
              )}
            </div>
          )},
        ]}
        fetchFn={fetchUsers}
      />
    </div>
  );
}
