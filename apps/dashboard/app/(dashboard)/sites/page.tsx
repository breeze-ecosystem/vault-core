"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import {
  fetchSites,
  createSite,
  updateSite,
  deleteSite,
  type Site,
} from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Plus, Trash2 } from "lucide-react";

export default function SitesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", country: "SN" });

  function resetForm() {
    setForm({ name: "", address: "", city: "", country: "SN" });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(site: Site) {
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
        await updateSite(editingId, data);
        toast("Site mis à jour", "success");
      } else {
        await createSite(data);
        toast("Site créé", "success");
      }
      resetForm();
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function handleDelete(site: Site) {
    if (!confirm(`Supprimer le site "${site.name}" ? Cette action est réversible (désactivation).`)) return;
    try {
      await deleteSite(site.id);
      toast("Site désactivé", "success");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Sites"
        description="Gestion des sites de surveillance"
        action={{ label: "Ajouter", icon: Plus, onClick: () => { resetForm(); setShowForm(true); } }}
      />

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

      <DataTable
        key={refreshKey}
        columns={[
          { key: "name", label: "Nom", render: (s: Site) => (
            <span className="font-medium">{s.name}</span>
          )},
          { key: "city", label: "Ville", render: (s: Site) => s.city ?? "—" },
          { key: "country", label: "Pays", render: (s: Site) => countryLabels[s.country] ?? s.country },
          { key: "cameras", label: "Caméras", render: (s: Site) => (
            <Badge variant="outline">{s._count?.cameras ?? 0}</Badge>
          )},
          { key: "users", label: "Utilisateurs", render: (s: Site) => (
            <Badge variant="outline">{s._count?.users ?? 0}</Badge>
          )},
          { key: "isActive", label: "Statut", render: (s: Site) => (
            <Badge variant={s.isActive ? "success" : "destructive"}>
              {s.isActive ? "Actif" : "Inactif"}
            </Badge>
          )},
          { key: "actions", label: "", render: (s: Site) => (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="ghost" onClick={() => startEdit(s)}>Modifier</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(s)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )},
        ]}
        fetchFn={fetchSites}
      />
    </div>
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
