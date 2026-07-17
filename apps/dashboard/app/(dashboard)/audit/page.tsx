"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchAuditLogs,
  verifyAuditChain,
  exportAuditLog,
  fetchAuditStats,
  type AuditEntryDto,
  type ChainVerificationResultDto,
  type AuditStatsDto,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import {
  Shield,
  Search,
  Download,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";

type Tab = "logs" | "verify" | "export";

const entityLabels: Record<string, string> = {
  credential: "Justificatif",
  access_level: "Niveau d'accès",
  schedule: "Planning",
  zone: "Zone",
  door: "Porte",
  camera_door_map: "Caméra-Porte",
  zone_emergency: "Urgence zone",
};

const actionLabels: Record<string, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  CREATE_FAILED: "Échec création",
  UPDATE_FAILED: "Échec modification",
  DELETE_FAILED: "Échec suppression",
};

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CREATE_FAILED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  UPDATE_FAILED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  DELETE_FAILED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const entities = [
  { value: "", label: "Toutes les entités" },
  { value: "credential", label: "Justificatif" },
  { value: "access_level", label: "Niveau d'accès" },
  { value: "schedule", label: "Planning" },
  { value: "zone", label: "Zone" },
  { value: "door", label: "Porte" },
  { value: "camera_door_map", label: "Caméra-Porte" },
  { value: "zone_emergency", label: "Urgence zone" },
];

const actions = [
  { value: "", label: "Toutes les actions" },
  { value: "CREATE", label: "Création" },
  { value: "UPDATE", label: "Modification" },
  { value: "DELETE", label: "Suppression" },
];

export default function AuditPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("logs");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit & Conformité"
        description="Traçabilité complète des opérations avec vérification d'intégrité cryptographique"
      />
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["logs", "verify", "export"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "logs" && "Journal d'audit"}
            {tab === "verify" && "Vérification"}
            {tab === "export" && "Export"}
          </button>
        ))}
      </div>

      {activeTab === "logs" && <AuditLogTab />}
      {activeTab === "verify" && <ChainVerifyTab />}
      {activeTab === "export" && <ExportTab />}
    </div>
  );
}

// ─── Audit Log Tab ───

function AuditLogTab() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<AuditEntryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AuditStatsDto | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    entity: "",
    action: "",
    userId: "",
    from: "",
    to: "",
  });
  const limit = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (filters.entity) params.entity = filters.entity;
      if (filters.action) params.action = filters.action;
      if (filters.userId) params.userId = filters.userId;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const result = await fetchAuditLogs(params);
      setEntries(result.data);
      setTotal(result.total);
    } catch (e) {
      // Audit logs fetch failure is non-critical
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    fetchAuditStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / limit);

  const updateFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.totalEntries}</div>
              <div className="text-sm text-muted-foreground">Total entrées</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {Object.keys(stats.byAction).length}
              </div>
              <div className="text-sm text-muted-foreground">Types d'actions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {Object.keys(stats.byEntity).length}
              </div>
              <div className="text-sm text-muted-foreground">Types d'entités</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs text-muted-foreground mb-1 block">
                Entité
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.entity}
                onChange={(e) => updateFilter("entity", e.target.value)}
              >
                {entities.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs text-muted-foreground mb-1 block">
                Action
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.action}
                onChange={(e) => updateFilter("action", e.target.value)}
              >
                {actions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs text-muted-foreground mb-1 block">
                Utilisateur (ID)
              </label>
              <Input
                placeholder="UUID utilisateur"
                value={filters.userId}
                onChange={(e) => updateFilter("userId", e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs text-muted-foreground mb-1 block">
                Du
              </label>
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => updateFilter("from", e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs text-muted-foreground mb-1 block">
                Au
              </label>
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => updateFilter("to", e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <Search className="h-4 w-4 mr-1" />
                Filtrer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({
                    entity: "",
                    action: "",
                    userId: "",
                    from: "",
                    to: "",
                  });
                  setPage(1);
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{t('audit.noEntries')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Horodatage</th>
                    <th className="px-4 py-3 text-left font-medium">Entité</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                    <th className="px-4 py-3 text-left font-medium">ID Entité</th>
                    <th className="px-4 py-3 text-left font-medium">Utilisateur</th>
                    <th className="px-4 py-3 text-left font-medium">IP</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <>
                      <tr
                        key={idx}
                        className="border-b hover:bg-muted/30 cursor-pointer"
                        onClick={() =>
                          setExpandedRow(expandedRow === idx ? null : idx)
                        }
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                          {new Date(entry.time).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {entityLabels[entry.entity] || entry.entity}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              actionColors[entry.action] ??
                              "bg-gray-100 text-gray-800"
                            }
                          >
                            {actionLabels[entry.action] || entry.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                          {entry.entityId?.substring(0, 12)}...
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {entry.userId
                            ? entry.userId.substring(0, 8) + "..."
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {entry.ipAddress || "—"}
                        </td>
                        <td className="px-3 py-3">
                          {expandedRow === idx ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </td>
                      </tr>
                      {expandedRow === idx && (
                        <tr key={`expanded-${idx}`} className="bg-muted/20">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="font-semibold">Hash: </span>
                                <span className="font-mono break-all">
                                  {entry.hash}
                                </span>
                              </div>
                              {entry.previousHash && (
                                <div>
                                  <span className="font-semibold">
                                    Hash précédent:{" "}
                                  </span>
                                  <span className="font-mono break-all">
                                    {entry.previousHash}
                                  </span>
                                </div>
                              )}
                              {entry.changes && (
                                <div>
                                  <span className="font-semibold">
                                    Changements:{" "}
                                  </span>
                                  <pre className="mt-1 whitespace-pre-wrap bg-muted/50 rounded p-2 max-h-48 overflow-auto font-mono">
                                    {JSON.stringify(entry.changes, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} sur {totalPages} ({total} entrées)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chain Verification Tab ───

function ChainVerifyTab() {
  const [entity, setEntity] = useState("");
  const [entityId, setEntityId] = useState("");
  const [result, setResult] = useState<ChainVerificationResultDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verify = async () => {
    if (!entity || !entityId) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await verifyAuditChain(entity, entityId);
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Échec de la vérification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vérification de la chaîne de hachage</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sélectionnez une entité et un ID pour vérifier l'intégrité de sa
          chaîne d'audit cryptographique.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Entité</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
            >
              <option value="">Sélectionner...</option>
              {entities
                .filter((e) => e.value)
                .map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">ID Entité</label>
            <Input
              placeholder="UUID de l'entité"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={verify} disabled={loading || !entity || !entityId}>
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Shield className="h-4 w-4 mr-2" />
          )}
          Vérifier l'intégrité
        </Button>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div
            className={`rounded-lg border p-6 ${
              result.verified
                ? "border-green-500/30 bg-green-500/5"
                : "border-red-500/30 bg-red-500/5"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              {result.verified ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-500" />
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  {result.verified
                    ? `Chaîne de hachage vérifiée — ${result.totalEntries} entrées intactes`
                    : `INTÉGRITÉ COMPROMISE — ${result.tamperedIndices.length} entrées altérées`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {result.totalEntries} entrées au total
                </p>
              </div>
            </div>

            {/* Chain visualization */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Array.from({ length: result.totalEntries }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full border ${
                    result.tamperedIndices.includes(i)
                      ? "bg-red-500 border-red-600"
                      : "bg-green-500 border-green-600"
                  }`}
                  title={
                    result.tamperedIndices.includes(i)
                      ? `Entrée #${i + 1}: ALTÉRÉE`
                      : `Entrée #${i + 1}: Intacte`
                  }
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Hash de genèse :</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {result.genesisHash || "N/A"}
                </div>
              </div>
              <div>
                <span className="font-semibold">Dernier hash :</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {result.latestHash || "N/A"}
                </div>
              </div>
            </div>

            {!result.verified && result.tamperedIndices.length > 0 && (
              <div className="mt-4">
                <span className="font-semibold text-sm text-red-600">
                  Indices altérés : {result.tamperedIndices.join(", ")}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Export Tab ───

function ExportTab() {
  const [filters, setFilters] = useState({
    entity: "",
    userId: "",
    action: "",
    from: "",
    to: "",
    format: "json" as "json" | "csv",
  });
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportAuditLog({
        ...filters,
        format: filters.format,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = filters.format === "csv" ? "csv" : "json";
      a.download = `audit-export-${new Date().toISOString().split("T")[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Export failure — non-critical, user can retry
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export des journaux d'audit</CardTitle>
        <p className="text-sm text-muted-foreground">
          Exportez les données d'audit filtrées au format JSON ou CSV pour
          analyse externe.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Entité</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filters.entity}
              onChange={(e) =>
                setFilters((f) => ({ ...f, entity: e.target.value }))
              }
            >
              {entities.map((ent) => (
                <option key={ent.value} value={ent.value}>
                  {ent.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Action</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filters.action}
              onChange={(e) =>
                setFilters((f) => ({ ...f, action: e.target.value }))
              }
            >
              {actions.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Format</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filters.format}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  format: e.target.value as "json" | "csv",
                }))
              }
            >
              <option value="json">JSON (détaillé, avec hachages)</option>
              <option value="csv">CSV (tableur)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Du</label>
            <Input
              type="date"
              value={filters.from}
              onChange={(e) =>
                setFilters((f) => ({ ...f, from: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Au</label>
            <Input
              type="date"
              value={filters.to}
              onChange={(e) =>
                setFilters((f) => ({ ...f, to: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              ID Utilisateur
            </label>
            <Input
              placeholder="UUID (optionnel)"
              value={filters.userId}
              onChange={(e) =>
                setFilters((f) => ({ ...f, userId: e.target.value }))
              }
            />
          </div>
        </div>

        <Button onClick={handleExport} disabled={exporting} size="lg">
          {exporting ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : filters.format === "csv" ? (
            <FileSpreadsheet className="h-4 w-4 mr-2" />
          ) : (
            <FileJson className="h-4 w-4 mr-2" />
          )}
          {exporting ? "Téléchargement en cours..." : "Exporter"}
        </Button>
      </CardContent>
    </Card>
  );
}
