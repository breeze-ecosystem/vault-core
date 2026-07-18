"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { RBACRoleEditor } from "@/components/rbac-role-editor";
import { getRoles, updateRole, createCustomRole, type RoleDefinition } from "@/lib/api";
import { toast } from "@/components/ui/toast";

export default function RBACPage() {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement des rôles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  async function handleSave(roleName: string, permissions: string[]) {
    try {
      await updateRole(roleName, permissions);
      toast("Rôle mis à jour", "success");
      loadRoles();
    } catch (e: any) {
      toast.error(e.message || "Échec de la mise à jour du rôle");
      throw e;
    }
  }

  async function handleCreateCustom(data: { name: string; permissions: string[]; parentRole: string }) {
    try {
      await createCustomRole(data);
      toast("Rôle créé avec succès", "success");
      loadRoles();
    } catch (e: any) {
      toast.error(e.message || "Échec de création du rôle");
      throw e;
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Rôles & permissions"
          description="Gérez les rôles et permissions des utilisateurs"
        />
        <RBACRoleEditor
          roles={roles}
          loading={loading}
          error={error}
          onSave={handleSave}
          onCreateCustomRole={handleCreateCustom}
          onRetry={loadRoles}
        />
      </div>
    </PageTransition>
  );
}
