"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { LicenseStatusBadge } from "@/components/license-status-badge";
import { LicenseUsageBars } from "@/components/license-usage-bars";
import { LicenseExpiryCountdown } from "@/components/license-expiry-countdown";
import { LicenseEmptyState } from "@/components/license-empty-state";
import { ApiKeyCreateDialog } from "@/components/api-key-create-dialog";
import { ApiKeyList } from "@/components/api-key-list";
import {
  listLicenses,
  listApiKeys,
  revokeApiKey,
  fetchOrganizations,
  type LicenseDto,
  type Organization,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Key,
  Plus,
  Copy,
  CheckCircle,
  Shield,
  RefreshCw,
  MoreHorizontal,
  Calendar,
  Monitor,
  DoorOpen,
  Loader2,
} from "lucide-react";

type Tab = "licenses" | "api-keys";

interface CreateLicenseForm {
  organizationId: string;
  maxCameras: number;
  maxDoors: number;
  expiresAt: string;
  gracePeriodDays: number;
}

export default function LicencesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("licenses");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Licences"
        description="Gérez les licences des organisations"
        action={{
          label: "Créer une licence",
          icon: Plus,
          onClick: () => setActiveTab("licenses"),
        }}
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["licenses", "api-keys"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "licenses" ? "Licences" : "Clés API"}
          </button>
        ))}
      </div>

      {activeTab === "licenses" && <LicenseTab />}
      {activeTab === "api-keys" && <ApiKeysTab />}
    </div>
  );
}

// ─── Licenses Tab ───

function LicenseTab() {
  const [licenses, setLicenses] = useState<LicenseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadLicenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listLicenses();
      setLicenses(data);
    } catch (e: any) {
      setError(e.message || "Échec du chargement des licences");
      toast(e.message || "Échec du chargement des licences", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLicenses();
  }, [loadLicenses]);

  return (
    <div className="space-y-4">
      {/* Loading state */}
      {loading ? (
        <Card>
          <CardContent className="p-0">
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        /* Error state */
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={loadLicenses}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : licenses.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="p-0">
            <LicenseEmptyState isAdmin={true} onCreateClick={() => setShowCreateDialog(true)} />
          </CardContent>
        </Card>
      ) : (
        /* Table */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Organisation</th>
                    <th className="px-4 py-3 text-left font-medium">Statut</th>
                    <th className="px-4 py-3 text-left font-medium">Expire le</th>
                    <th className="px-4 py-3 text-left font-medium">Caméras</th>
                    <th className="px-4 py-3 text-left font-medium">Portes</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((lic) => (
                    <tr key={lic.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">
                        {lic.organization?.name ?? lic.organizationId.substring(0, 8) + "..."}
                      </td>
                      <td className="px-4 py-3">
                        <LicenseStatusBadge state={lic.status.toLowerCase() as any} />
                      </td>
                      <td className="px-4 py-3">
                        <LicenseExpiryCountdown
                          state={lic.status.toLowerCase() as any}
                          expiresAt={lic.expiresAt}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <LicenseUsageBars
                          current={0}
                          max={lic.maxCameras}
                          label="Caméras"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <LicenseUsageBars
                          current={0}
                          max={lic.maxDoors}
                          label="Portes"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="text-muted-foreground">
                            Voir détail
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create License Dialog */}
      {showCreateDialog && (
        <CreateLicenseDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreated={() => {
            setShowCreateDialog(false);
            loadLicenses();
          }}
        />
      )}
    </div>
  );
}

// ─── Create License Dialog ───

function CreateLicenseDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [form, setForm] = useState<CreateLicenseForm>({
    organizationId: "",
    maxCameras: 4,
    maxDoors: 8,
    expiresAt: "",
    gracePeriodDays: 7,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ rawKey?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      fetchOrganizations()
        .then((res) => setOrgs(res.data))
        .catch(() => {});
    }
  }, [open]);

  const handleCreate = async () => {
    if (!form.organizationId || !form.expiresAt || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/licenses/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Échec de la génération de la licence");
      }
      const data = await res.json();
      setResult(data);
      toast("Licence créée avec succès", "success");
      onCreated();
    } catch (e: any) {
      setError(e.message);
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.rawKey) return;
    try {
      await navigator.clipboard.writeText(result.rawKey);
      setCopied(true);
      toast("Clé de licence copiée dans le presse-papier", "success");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast("Impossible de copier la clé", "error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {result ? "Licence générée" : "Créer une licence"}
          </DialogTitle>
          <DialogDescription>
            {result
              ? "Transmettez cette clé JWT au client pour activation."
              : "Configurez les paramètres de la nouvelle licence."}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Organisation</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.organizationId}
                onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
              >
                <option value="">Sélectionner une organisation...</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Caméras (max)
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.maxCameras}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxCameras: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Portes (max)
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.maxDoors}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxDoors: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Date d&apos;expiration
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Période de grâce (jours)
              </label>
              <input
                type="number"
                min={0}
                max={90}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.gracePeriodDays}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gracePeriodDays: parseInt(e.target.value) || 7 }))
                }
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              onClick={handleCreate}
              disabled={!form.organizationId || !form.expiresAt || loading}
            >
              {loading ? "Génération..." : "Générer la licence"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-medium">Licence générée</p>
                <p className="text-sm text-muted-foreground">
                  Transmettez cette clé JWT au client pour activation.
                </p>
              </div>
            </div>

            <div className="relative">
              <pre className="overflow-x-auto rounded-md border bg-muted p-3 font-mono text-xs break-all whitespace-pre-wrap max-h-32">
                {result.rawKey}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCopy}>
                {copied ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copier la clé de licence
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── API Keys Tab ───

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listApiKeys();
      setKeys(data);
    } catch (e: any) {
      toast(e.message || "Échec du chargement des clés API", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiKey(id);
      toast("Clé API révoquée", "success");
      loadKeys();
    } catch (e: any) {
      toast(e.message || "Échec de la révocation", "error");
    }
  };

  const handleCreated = () => {
    setShowCreateDialog(false);
    loadKeys();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Clés API pour génération de licences</h2>
          <p className="text-sm text-muted-foreground">
            Créez une clé API pour utiliser l&apos;API REST de génération de licences.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Créer une clé API
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <ApiKeyList keys={keys} onRevoke={handleRevoke} />
          )}
        </CardContent>
      </Card>

      <ApiKeyCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={handleCreated}
      />
    </div>
  );
}

// Re-export the ApiKeyRecord type for the tab
interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  createdAt: string;
}
