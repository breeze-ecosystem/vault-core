"use client";

import { useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Plus, Shield, Save, X } from "lucide-react";
import { type RoleDefinition } from "@/lib/api";

const PERMISSION_LABELS: Record<string, string> = {
  advanced_facial_recognition: "Reconnaissance faciale avancée",
  anti_spoofing: "Anti-spoofing",
  weapon_detection: "Détection d'armes",
  abandoned_object_detection: "Détection d'objets abandonnés",
  crowd_counting: "Comptage de foule",
  zone_intrusion: "Intrusion de zone",
  multi_site: "Multi-site",
  rfid_integration: "Intégration RFID",
  biometric_integration: "Intégration biométrique",
  sso: "Authentification SSO",
  audit_view: "Consultation des audits",
  site_management: "Gestion des sites",
};

interface RBACRoleEditorProps {
  roles: RoleDefinition[];
  loading?: boolean;
  error?: string | null;
  onSave: (roleName: string, permissions: string[]) => Promise<void>;
  onCreateCustomRole: (data: { name: string; permissions: string[]; parentRole: string }) => Promise<void>;
  onRetry?: () => void;
}

export function RBACRoleEditor({
  roles,
  loading = false,
  error = null,
  onSave,
  onCreateCustomRole,
  onRetry,
}: RBACRoleEditorProps) {
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customParent, setCustomParent] = useState("ADMIN");
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
        <p className="mb-2 text-lg font-medium">Erreur de chargement des rôles</p>
        <p className="mb-6 text-sm text-muted-foreground">{error}</p>
        {onRetry && (
          <Button variant="default" onClick={onRetry}>Réessayer</Button>
        )}
      </div>
    );
  }

  const standardRoles = roles.filter((r) => !r.isCustom);
  const customRoles = roles.filter((r) => r.isCustom);

  function togglePermission(perm: string) {
    setEditPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm],
    );
  }

  function toggleCustomPermission(perm: string) {
    setCustomPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm],
    );
  }

  function startEdit(role: RoleDefinition) {
    setEditingRole(role.name);
    setEditPermissions([...role.permissions]);
  }

  async function handleSave() {
    if (!editingRole) return;
    setSaving(true);
    try {
      await onSave(editingRole, editPermissions);
      setEditingRole(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCustom() {
    if (!customName.trim()) return;
    setSaving(true);
    try {
      await onCreateCustomRole({
        name: customName.trim(),
        permissions: customPermissions,
        parentRole: customParent,
      });
      setShowCustomForm(false);
      setCustomName("");
      setCustomPermissions([]);
    } finally {
      setSaving(false);
    }
  }

  function getLevelColor(level: number): "secondary" | "destructive" | "warning" | "default" {
    if (level >= 90) return "destructive";
    if (level >= 75) return "warning";
    if (level >= 45) return "default";
    return "secondary";
  }

  return (
    <div className="space-y-6">
      {/* Standard hierarchy */}
      <div className="space-y-3">
        {standardRoles.map((role) => (
          <GlassCard key={role.name} className="overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="text-sm font-semibold">{role.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={getLevelColor(role.level)} className="text-[10px]">
                        Niveau {role.level}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {role.memberCount} membre{role.memberCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(role)}
                >
                  Modifier
                </Button>
              </div>

              {/* Permissions matrix */}
              {editingRole === role.name ? (
                <div className="space-y-3 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Permissions BASTION</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-accent/20 cursor-pointer"
                      >
                        <Switch
                          checked={editPermissions.includes(key)}
                          onCheckedChange={() => togglePermission(key)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="mr-2 h-3 w-3" />
                      {saving ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingRole(null)}>
                      <X className="mr-2 h-3 w-3" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
                  {role.permissions.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Aucune permission spécifique</span>
                  ) : (
                    role.permissions.map((perm) => (
                      <Badge key={perm} variant="outline" className="text-[10px]">
                        {PERMISSION_LABELS[perm] || perm}
                      </Badge>
                    ))
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Custom roles section */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Rôles personnalisés</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomForm(!showCustomForm)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Créer un rôle personnalisé
          </Button>
        </div>

        {showCustomForm && (
          <GlassCard className="mb-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nom du rôle</Label>
                <Input
                  placeholder="Ex: Chef de sécurité"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Rôle parent</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={customParent}
                  onChange={(e) => setCustomParent(e.target.value)}
                >
                  {standardRoles.map((r) => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-2 block">Permissions</Label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-accent/20 cursor-pointer"
                    >
                      <Switch
                        checked={customPermissions.includes(key)}
                        onCheckedChange={() => toggleCustomPermission(key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={handleCreateCustom} disabled={saving || !customName.trim()}>
                {saving ? "Création..." : "Créer le rôle"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCustomForm(false)}>
                Annuler
              </Button>
            </div>
          </GlassCard>
        )}

        {/* Custom roles list */}
        {customRoles.length === 0 && !showCustomForm ? (
          <GlassCard className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun rôle personnalisé. Les rôles par défaut sont déjà configurés.
            </p>
          </GlassCard>
        ) : (
          customRoles.map((role) => (
            <GlassCard key={role.name} className="mb-3 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-warning" />
                  <div>
                    <h4 className="text-sm font-semibold">{role.name}</h4>
                    <span className="text-[10px] text-muted-foreground">
                      {role.memberCount} membre{role.memberCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => startEdit(role)}>Modifier</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3 border-t border-border pt-3">
                {role.permissions.map((perm) => (
                  <Badge key={perm} variant="outline" className="text-[10px]">
                    {PERMISSION_LABELS[perm] || perm}
                  </Badge>
                ))}
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
