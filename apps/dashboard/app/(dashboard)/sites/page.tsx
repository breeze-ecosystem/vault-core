"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/table";
import { fetchSites, createSite, updateSite, type Site } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Plus, MapPin } from "lucide-react";

export default function SitesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", country: "SN" });
  const [refreshKey, setRefreshKey] = useState(0);

  function resetForm() {
    setForm({ name: "", address: "", city: "", country: "SN" });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(site: Site) {
    setForm({ name: site.name, address: site.address ?? "", city: site.city ?? "", country: site.country });
    setEditingId(site.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = { name: form.name, address: form.address || undefined, city: form.city || undefined, country: form.country };
      if (editingId) {
        await updateSite(editingId, data);
        toast("Site mis a jour", "success");
      } else {
        await createSite(data);
        toast("Site cree", "success");
      }
      resetForm();
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Sites"
        description="Administration des sites surveilles"
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
              <label className="mb-1 block text-sm text-muted-foreground">Ville</label>
              <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Adresse</label>
              <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Pays</label>
              <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit">{editingId ? "Modifier" : "Creer"}</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
          </div>
        </form>
      )}

      <DataTable
        key={refreshKey}
        columns={[
          { key: "name", label: "Nom", render: (s: Site) => (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{s.name}</span>
            </div>
          )},
          { key: "city", label: "Ville", render: (s: Site) => s.city ?? "—" },
          { key: "country", label: "Pays" },
          { key: "cameras", label: "Cameras", render: (s: Site) => String(s._count?.cameras ?? 0) },
          { key: "isActive", label: "Statut", render: (s: Site) => (
            <Badge variant={s.isActive ? "success" : "destructive"}>{s.isActive ? "Actif" : "Inactif"}</Badge>
          )},
          { key: "actions", label: "", render: (s: Site) => (
            <Button size="sm" variant="ghost" onClick={(e: any) => { e.stopPropagation(); startEdit(s); }}>Modifier</Button>
          )},
        ]}
        fetchFn={fetchSites}
      />
    </div>
  );
}
