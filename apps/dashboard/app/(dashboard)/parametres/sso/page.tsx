"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { GlassCard } from "@/components/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SSOConfigForm } from "@/components/sso-config-form";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { getSsoProviders, createSsoProvider, updateSsoProvider, deleteSsoProvider, testSsoConnection, type SsoProvider, type SsoProviderConfig } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Plus, Shield, Trash2, Edit, ExternalLink, AlertTriangle } from "lucide-react";

export default function SSOPage() {
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<SsoProvider | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SsoProvider | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSsoProviders();
      setProviders(data);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement des fournisseurs SSO");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  async function handleSave(data: SsoProviderConfig) {
    setSaving(true);
    try {
      if (editingProvider) {
        await updateSsoProvider(editingProvider.id, data);
        toast("Fournisseur SSO mis à jour", "success");
      } else {
        await createSsoProvider(data);
        toast("Fournisseur SSO créé", "success");
      }
      setShowForm(false);
      setEditingProvider(null);
      loadProviders();
    } catch (e: any) {
      toast.error(e.message || "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSsoProvider(deleteTarget.id);
      toast("Fournisseur SSO supprimé", "success");
      setDeleteTarget(null);
      loadProviders();
    } catch (e: any) {
      toast.error(e.message || "Échec de la suppression");
    } finally {
      setDeleting(false);
    }
  }

  async function handleTest(id: string) {
    return testSsoConnection(id);
  }

  function openEdit(provider: SsoProvider) {
    setEditingProvider(provider);
    setShowForm(true);
  }

  function openCreate() {
    setEditingProvider(null);
    setShowForm(true);
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Authentification unique (SSO)"
          description="Configurez un fournisseur SAML ou OAuth2"
          action={{
            label: "Ajouter un fournisseur",
            icon: Plus,
            onClick: openCreate,
          }}
        />

        {error && (
          <div className="flex items-center justify-between rounded-lg bg-destructive/10 p-4">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
            <Button variant="outline" size="sm" onClick={loadProviders}>Réessayer</Button>
          </div>
        )}

        {/* Provider list */}
        {providers.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Shield className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              Aucun fournisseur SSO configuré
            </p>
            <p className="mt-1 mb-4 text-xs text-muted-foreground">
              Configurez un fournisseur SAML ou OAuth2 pour l'authentification unique.
            </p>
            <Button variant="default" size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un fournisseur
            </Button>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => (
              <GlassCard key={provider.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold">{provider.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">
                          {provider.type === "saml" ? "SAML 2.0" : "OpenID Connect"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {provider.issuerUrl || "URL non configurée"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTest(provider.id)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(provider)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteTarget(provider)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Create/Edit form dialog */}
        <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingProvider(null); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? `Modifier : ${editingProvider.name}` : "Ajouter un fournisseur SSO"}
              </DialogTitle>
              <DialogDescription>
                Configurez les paramètres du fournisseur d'authentification unique
              </DialogDescription>
            </DialogHeader>
            <SSOConfigForm
              provider={editingProvider}
              onSave={handleSave}
              onTest={handleTest}
              onCancel={() => { setShowForm(false); setEditingProvider(null); }}
              saving={saving}
            />
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <ConfirmationDialog
          isOpen={!!deleteTarget}
          title="Supprimer le fournisseur SSO"
          description={`Les utilisateurs ne pourront plus se connecter via "${deleteTarget?.name}". Les comptes existants restent actifs avec mot de passe.`}
          confirmLabel={deleting ? "Suppression..." : "Supprimer"}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleting}
        />
      </div>
    </PageTransition>
  );
}
