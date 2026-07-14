"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createIncident, fetchSites, type Site } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewIncidentPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [siteId, setSiteId] = useState("");
  const [sourceType, setSourceType] = useState("manual");
  const [sites, setSites] = useState<Site[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchSites({ limit: 100 });
        const sitesData = res.data;
        setSites(sitesData);
        if (sitesData.length > 0) {
          const first = sitesData[0];
          if (first) setSiteId(first.id);
        }
      } catch {
        // Sites fetch failed silently
      }
    })();
  }, []);

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Le titre est requis");
      return;
    }
    if (!severity) {
      setError("La sévérité est requise");
      return;
    }
    if (!siteId) {
      setError("Le site est requis");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const incident = await createIncident({
        title: title.trim(),
        severity,
        description: description.trim() || undefined,
        siteId,
        sourceType,
      });
      router.push(`/incidents/${incident.id}`);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/incidents")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <PageHeader
          title={t("incidents.create")}
          description="Créez un nouvel incident de sécurité"
        />
      </div>

      <Card className="max-w-2xl">
        <CardContent className="pt-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("incidents.titleField")} *</label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Titre de l'incident"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("incidents.severity")} *</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="CRITICAL">{t("incidents.severities.CRITICAL")}</option>
              <option value="HIGH">{t("incidents.severities.HIGH")}</option>
              <option value="MEDIUM">{t("incidents.severities.MEDIUM")}</option>
              <option value="LOW">{t("incidents.severities.LOW")}</option>
              <option value="INFO">{t("incidents.severities.INFO")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("incidents.description")}</label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
              placeholder="Description de l'incident (optionnelle)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Site *</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
            >
              <option value="">Sélectionner un site...</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type de source</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="sourceType"
                  value="manual"
                  checked={sourceType === "manual"}
                  onChange={(e) => setSourceType(e.target.value)}
                />
                Manuel
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="sourceType"
                  value="alert"
                  checked={sourceType === "alert"}
                  onChange={(e) => setSourceType(e.target.value)}
                />
                Alerte
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => router.push("/incidents")}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                t("incidents.create")
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
