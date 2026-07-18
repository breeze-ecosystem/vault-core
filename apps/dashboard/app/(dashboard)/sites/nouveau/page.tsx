"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSite } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Building2, ArrowLeft } from "lucide-react";

export default function NouveauSitePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    country: "SN",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Le nom du site est requis");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createSite({
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        country: form.country,
      });
      toast("Site créé avec succès", "success");
      router.push("/sites");
    } catch (e: any) {
      setError(e.message || "Échec de création du site");
      toast.error(e.message || "Échec de création du site");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Ajouter un site"
          description="Configurez un nouveau site de surveillance"
        />

        <GlassCard className="max-w-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">
                  Nom du site <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ex: Siège Niamey"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  placeholder="Ex: 123 Avenue de la République"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  placeholder="Ex: Niamey"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="country">Pays</Label>
                <select
                  id="country"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                >
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
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Création..." : "Créer le site"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/sites")}
              >
                Annuler
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
    </PageTransition>
  );
}
