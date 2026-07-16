"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { fetchIdpConfig, updateIdpConfig, type IdpConfig } from "@/lib/api";

export function SsoConfigForm() {
  const [config, setConfig] = useState<IdpConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [protocol, setProtocol] = useState<"saml" | "oidc">("saml");
  const [metadataUrl, setMetadataUrl] = useState("");
  const [entityId, setEntityId] = useState("oversight-hub");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [issuerUrl, setIssuerUrl] = useState("");
  const [ssoEnforced, setSsoEnforced] = useState(false);

  useEffect(() => {
    fetchIdpConfig()
      .then((data) => {
        if (data) {
          setConfig(data);
          setProtocol(data.protocol as "saml" | "oidc");
          setMetadataUrl(data.metadataUrl || "");
          setEntityId(data.entityId || "oversight-hub");
          setClientId(data.clientId || "");
          setClientSecret(data.clientSecret || "");
          setIssuerUrl(data.issuerUrl || "");
          setSsoEnforced(data.ssoEnforced || false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateIdpConfig({
        protocol,
        metadataUrl: protocol === "saml" ? metadataUrl : undefined,
        entityId: protocol === "saml" ? entityId : undefined,
        clientId: protocol === "oidc" ? clientId : undefined,
        clientSecret: protocol === "oidc" ? clientSecret : undefined,
        issuerUrl: protocol === "oidc" ? issuerUrl : undefined,
        ssoEnforced,
      });
      toast("Configuration SSO enregistrée", "success");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Configuration SSO</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Protocole</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={protocol}
              onChange={(e) => setProtocol(e.target.value as "saml" | "oidc")}
            >
              <option value="saml">SAML 2.0</option>
              <option value="oidc">OpenID Connect</option>
            </select>
          </div>

          {protocol === "saml" && (
            <>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">URL des métadonnées IdP</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={metadataUrl}
                  onChange={(e) => setMetadataUrl(e.target.value)}
                  placeholder="https://idp.example.com/metadata.xml"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Entity ID</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder="oversight-hub"
                />
              </div>
            </>
          )}

          {protocol === "oidc" && (
            <>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Client ID</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="oidc-client-id"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Client Secret</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">URL de l'émetteur</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={issuerUrl}
                  onChange={(e) => setIssuerUrl(e.target.value)}
                  placeholder="https://accounts.example.com"
                />
              </div>
            </>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ssoEnforced}
              onChange={(e) => setSsoEnforced(e.target.checked)}
              className="rounded border-input"
            />
            Forcer la connexion SSO uniquement
          </label>

          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
