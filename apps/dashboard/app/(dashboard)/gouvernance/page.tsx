"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  fetchRetentionPolicies,
  createRetentionPolicy,
  updateRetentionPolicy,
  deleteRetentionPolicy,
  fetchGovernanceStatus,
  testEncrypt,
  testDecrypt,
  type RetentionPolicyDto,
  type GovernanceStatusDto,
} from "@/lib/api";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Lock,
  Unlock,
  Database,
  Clock,
} from "lucide-react";

const DEFAULT_POLICIES = [
  { eventType: "access_events", tableType: "timescaledb", retentionDays: 90 },
  { eventType: "door_state_log", tableType: "timescaledb", retentionDays: 90 },
  { eventType: "audit_log", tableType: "timescaledb", retentionDays: 365 },
  { eventType: "incident_events", tableType: "timescaledb", retentionDays: 365 },
  { eventType: "vehicle_events", tableType: "timescaledb", retentionDays: 90 },
  { eventType: "reader_health", tableType: "timescaledb", retentionDays: 90 },
  { eventType: "controller_health", tableType: "timescaledb", retentionDays: 90 },
  { eventType: "camera_health", tableType: "timescaledb", retentionDays: 90 },
];

const EVENT_TYPE_LABELS: Record<string, string> = {
  access_events: "Événements d'accès",
  door_state_log: "Journal d'état des portes",
  audit_log: "Journal d'audit",
  incident_events: "Événements d'incidents",
  vehicle_events: "Événements véhicules",
  reader_health: "Santé des lecteurs",
  controller_health: "Santé des contrôleurs",
  camera_health: "Santé des caméras",
  event_embeddings: "Embeddings d'événements",
  notification_log: "Journal de notifications",
  refresh_token: "Jetons de rafraîchissement",
};

export default function GovernancePage() {
  const [policies, setPolicies] = useState<RetentionPolicyDto[]>([]);
  const [governanceStatus, setGovernanceStatus] = useState<GovernanceStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState<string | null>(null);
  const [encryptValue, setEncryptValue] = useState("");
  const [encryptResult, setEncryptResult] = useState("");
  const [decryptValue, setDecryptValue] = useState("");
  const [decryptResult, setDecryptResult] = useState("");

  // Form state
  const [form, setForm] = useState({
    eventType: "access_events",
    tableType: "timescaledb" as "timescaledb" | "prisma",
    retentionDays: 90,
    enabled: true,
  });

  const loadPolicies = useCallback(async () => {
    try {
      const [polis, status] = await Promise.all([
        fetchRetentionPolicies(),
        fetchGovernanceStatus(),
      ]);
      setPolicies(polis);
      setGovernanceStatus(status);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  function resetForm() {
    setForm({ eventType: "access_events", tableType: "timescaledb", retentionDays: 90, enabled: true });
    setShowCreateForm(false);
    setShowEditForm(null);
  }

  async function handleCreate() {
    try {
      await createRetentionPolicy(form);
      toast("Politique créée", "success");
      resetForm();
      loadPolicies();
    } catch (err: any) {
      toast("Erreur : " + (err.message ?? String(err)), "error");
    }
  }

  async function handleUpdate(id: string) {
    try {
      await updateRetentionPolicy(id, { retentionDays: form.retentionDays, enabled: form.enabled });
      toast("Politique mise à jour", "success");
      resetForm();
      loadPolicies();
    } catch (err: any) {
      toast("Erreur : " + (err.message ?? String(err)), "error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette politique de rétention ?")) return;
    try {
      await deleteRetentionPolicy(id);
      toast("Politique supprimée", "success");
      loadPolicies();
    } catch (err: any) {
      toast("Erreur : " + (err.message ?? String(err)), "error");
    }
  }

  async function handleToggle(id: string, currentEnabled: boolean) {
    try {
      await updateRetentionPolicy(id, { enabled: !currentEnabled });
      loadPolicies();
    } catch (err: any) {
      toast("Erreur : " + (err.message ?? String(err)), "error");
    }
  }

  async function handleTestEncrypt() {
    try {
      const result = await testEncrypt(encryptValue);
      setEncryptResult(result.encrypted);
    } catch (err: any) {
      toast("Erreur : " + (err.message ?? String(err)), "error");
    }
  }

  async function handleTestDecrypt() {
    try {
      const result = await testDecrypt(decryptValue);
      setDecryptResult(result.decrypted);
    } catch (err: any) {
      toast("Erreur : " + (err.message ?? String(err)), "error");
    }
  }

  function startEdit(policy: RetentionPolicyDto) {
    setForm({
      eventType: policy.eventType,
      tableType: policy.tableType as "timescaledb" | "prisma",
      retentionDays: policy.retentionDays,
      enabled: policy.enabled,
    });
    setShowEditForm(policy.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gouvernance des données"
        description="Chiffrement au repos et politiques de rétention des données"
      />

      {/* Section 1: Encryption */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Chiffrement
            </CardTitle>
            {governanceStatus ? (
              governanceStatus.encryptionConfigured ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Chiffrement actif
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <ShieldOff className="h-3 w-3" />
                  Non configuré
                </Badge>
              )
            ) : (
              <Badge variant="outline">Vérification...</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Les données sensibles (informations visiteurs, numéros de badge) sont chiffrées au repos
            avec pgcrypto AES-256. La clé de chiffrement est configurée via la variable d'environnement{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">ENCRYPTION_KEY</code>.
          </p>

          {governanceStatus && !governanceStatus.encryptionConfigured && (
            <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
              <ShieldOff className="mr-2 inline h-4 w-4" />
              Configurez ENCRYPTION_KEY dans les variables d'environnement pour activer le chiffrement.
            </div>
          )}

          {/* Test encrypt/decrypt */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Valeur à chiffrer</Label>
              <div className="flex gap-2">
                <Input
                  value={encryptValue}
                  onChange={(e) => setEncryptValue(e.target.value)}
                  placeholder="ex: badge-12345"
                />
                <Button onClick={handleTestEncrypt} size="sm" variant="outline">
                  <Lock className="mr-1 h-3 w-3" />
                  Chiffrer
                </Button>
              </div>
              {encryptResult && (
                <div className="rounded-md bg-muted p-2">
                  <p className="text-xs text-muted-foreground">Résultat chiffré:</p>
                  <p className="break-all font-mono text-xs">{encryptResult}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Valeur à déchiffrer</Label>
              <div className="flex gap-2">
                <Input
                  value={decryptValue}
                  onChange={(e) => setDecryptValue(e.target.value)}
                  placeholder="ex: \\xc1..."
                />
                <Button onClick={handleTestDecrypt} size="sm" variant="outline">
                  <Unlock className="mr-1 h-3 w-3" />
                  Déchiffrer
                </Button>
              </div>
              {decryptResult && (
                <div className="rounded-md bg-muted p-2">
                  <p className="text-xs text-muted-foreground">Résultat déchiffré:</p>
                  <p className="font-mono text-xs">{decryptResult}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Retention Policies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Politiques de rétention
            </CardTitle>
            <Button onClick={() => { resetForm(); setShowCreateForm(true); }} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Ajouter une politique
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : policies.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">Aucune politique de rétention configurée</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Politiques par défaut suggérées :
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {DEFAULT_POLICIES.map((p) => (
                  <Badge key={p.eventType} variant="outline" className="text-xs">
                    {EVENT_TYPE_LABELS[p.eventType] ?? p.eventType} ({p.retentionDays}j)
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type d'événement</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type de table</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Jours de rétention</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Statut</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((policy) => (
                    <tr key={policy.id} className="border-b border-border transition-colors hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-medium">
                        {EVENT_TYPE_LABELS[policy.eventType] ?? policy.eventType}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline">
                          {policy.tableType === "timescaledb" ? "TimescaleDB" : "Prisma"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {policy.retentionDays} jours
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => handleToggle(policy.id, policy.enabled)}
                          className="flex items-center gap-1 text-xs"
                        >
                          {policy.enabled ? (
                            <>
                              <ToggleRight className="h-4 w-4 text-success" />
                              <span className="text-success">Activé</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Désactivé</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(policy)}
                            className="text-xs text-primary hover:underline"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(policy.id)}
                            className="flex items-center gap-1 text-xs text-destructive hover:underline"
                          >
                            <Trash2 className="h-3 w-3" />
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Create/Edit Form */}
          {(showCreateForm || showEditForm) && (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="mb-3 text-sm font-semibold">
                {showCreateForm ? "Ajouter une politique" : "Modifier la politique"}
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Type d'événement</Label>
                  <select
                    value={form.eventType}
                    onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    disabled={!!showEditForm}
                  >
                    {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type de table</Label>
                  <select
                    value={form.tableType}
                    onChange={(e) => setForm({ ...form, tableType: e.target.value as "timescaledb" | "prisma" })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    disabled={!!showEditForm}
                  >
                    <option value="timescaledb">TimescaleDB</option>
                    <option value="prisma">Prisma</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Jours de rétention</Label>
                  <Input
                    type="number"
                    min={1}
                    max={3650}
                    value={form.retentionDays}
                    onChange={(e) => setForm({ ...form, retentionDays: parseInt(e.target.value) || 90 })}
                  />
                </div>
                <div className="flex items-end gap-2">
                  {showEditForm ? (
                    <>
                      <Button size="sm" onClick={() => handleUpdate(showEditForm)}>
                        Mettre à jour
                      </Button>
                      <Button size="sm" variant="outline" onClick={resetForm}>
                        Annuler
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={handleCreate}>
                        Créer
                      </Button>
                      <Button size="sm" variant="outline" onClick={resetForm}>
                        Annuler
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
