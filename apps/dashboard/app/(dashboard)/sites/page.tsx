"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { MultiSiteDashboard } from "@/components/multi-site-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import {
  fetchOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getSites,
  getAggregateStats,
  getComparisonData,
  type Organization,
  type Site,
  type AggregateStats,
  type ComparisonData,
} from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Plus, Trash2, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SitesPage() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", country: "SN" });

  // BASTION multi-site state
  const [bastionSites, setBastionSites] = useState<Site[]>([]);
  const [aggregateStats, setAggregateStats] = useState<AggregateStats | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [bastionLoading, setBastionLoading] = useState(true);
  const [bastionError, setBastionError] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("user");
      if (stored) {
        try {
          const user = JSON.parse(stored);
          setUserRole(user.role);
        } catch { /* ignore */ }
      }
    }
  }, []);

  const isMultiSiteAdmin = userRole === "GLOBAL_ADMIN" || userRole === "SUPER_ADMIN";

  const loadBastionData = useCallback(async () => {
    if (!isMultiSiteAdmin) return;
    setBastionLoading(true);
    setBastionError(null);
    try {
      const [sites, stats, comparison] = await Promise.all([
        getSites({ limit: 50 }),
        getAggregateStats(),
        getComparisonData("7d").catch(() => null),
      ]);
      setBastionSites(sites.data);
      setAggregateStats(stats);
      setComparisonData(comparison);
    } catch (e: any) {
      setBastionError(e.message || "Erreur de chargement");
    } finally {
      setBastionLoading(false);
    }
  }, [isMultiSiteAdmin]);

  useEffect(() => {
    loadBastionData();
  }, [loadBastionData, refreshKey]);

  function resetForm() {
    setForm({ name: "", address: "", city: "", country: "SN" });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(site: Organization) {
    setForm({
      name: site.name,
      address: site.address ?? "",
      city: site.city ?? "",
      country: site.country,
    });
    setEditingId(site.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = { name: form.name, address: form.address || undefined, city: form.city || undefined, country: form.country };
      if (editingId) {
        await updateOrganization(editingId, data);
        toast("Site mis à jour", "success");
      } else {
        await createOrganization(data);
        toast("Site créé", "success");
      }
      resetForm();
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function handleDelete(site: Organization) {
    if (!confirm(`Supprimer le site "${site.name}" ? Cette action est réversible (désactivation).`)) return;
    try {
      await deleteOrganization(site.id);
      toast("Site désactivé", "success");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Sites"
          description="Gestion des sites de surveillance"
          action={isMultiSiteAdmin ? {
            label: "Ajouter un site",
            icon: Building2,
            onClick: () => router.push("/sites/nouveau"),
          } : {
            label: "Ajouter",
            icon: Plus,
            onClick: () => { resetForm(); setShowForm(true); },
          }}
        />

        {/* BASTION Multi-site Dashboard for admin users */}
        {isMultiSiteAdmin && (
          <MultiSiteDashboard
            sites={bastionSites}
            aggregateStats={aggregateStats}
            comparisonData={comparisonData}
            loading={bastionLoading}
            error={bastionError}
            onRetry={loadBastionData}
          />
        )}

        {/* Legacy organization form (non-admin or when no multi-site) */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold">{editingId ? "Modifier le site" : "Nouveau site"}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Nom</label>
                <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Pays</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                  <option value="SN">Sénégal</option>
                  <option value="CI">Côte d'Ivoire</option>
                  <option value="ML">Mali</option>
                  <option value="BF">Burkina Faso</option>
                  <option value="GN">Guinée</option>
                  <option value="MR">Mauritanie</option>
                  <option value="NE">Niger</option>
                  <option value="BJ">Bénin</option>
                  <option value="TG">Togo</option>
                  <option value="FR">France</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Ville</label>
                <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Adresse</label>
                <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="submit">{editingId ? "Modifier" : "Créer"}</Button>
              <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
            </div>
          </form>
        )}

        {/* Standard organization DataTable (shown below multi-site view) */}
        <DataTable
          key={refreshKey}
          columns={[
            { key: "name", label: "Nom", render: (s: Organization) => (
              <span className="font-medium">{s.name}</span>
            )},
            { key: "city", label: "Ville", render: (s: Organization) => s.city ?? "—" },
            { key: "country", label: "Pays", render: (s: Organization) => countryLabels[s.country] ?? s.country },
            { key: "cameras", label: "Caméras", render: (s: Organization) => (
              <Badge variant="outline">{s._count?.cameras ?? 0}</Badge>
            )},
            { key: "users", label: "Utilisateurs", render: (s: Organization) => (
              <Badge variant="outline">{s._count?.users ?? 0}</Badge>
            )},
            { key: "isActive", label: "Statut", render: (s: Organization) => (
              <Badge variant={s.isActive ? "success" : "destructive"}>
                {s.isActive ? "Actif" : "Inactif"}
              </Badge>
            )},
            { key: "actions", label: "", render: (s: Organization) => (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="ghost" onClick={() => startEdit(s)}>Modifier</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(s)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )},
          ]}
          fetchFn={fetchOrganizations}
        />
      </div>
    </PageTransition>
  );
}

const countryLabels: Record<string, string> = {
  SN: "Sénégal",
  CI: "Côte d'Ivoire",
  ML: "Mali",
  BF: "Burkina Faso",
  GN: "Guinée",
  MR: "Mauritanie",
  NE: "Niger",
  BJ: "Bénin",
  TG: "Togo",
  FR: "France",
  OTHER: "Autre",
};
