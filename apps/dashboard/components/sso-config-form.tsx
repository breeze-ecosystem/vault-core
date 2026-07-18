"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GlassCard } from "@/components/glass-card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { type SsoProvider, type SsoProviderConfig } from "@/lib/api";

interface SSOConfigFormProps {
  provider?: SsoProvider | null;
  onSave: (data: SsoProviderConfig) => Promise<void>;
  onTest?: (id: string) => Promise<{ success: boolean; message: string }>;
  onCancel?: () => void;
  saving?: boolean;
}

export function SSOConfigForm({
  provider,
  onSave,
  onTest,
  onCancel,
  saving = false,
}: SSOConfigFormProps) {
  const [type, setType] = useState<"saml" | "oidc">(provider?.type ?? "saml");
  const [name, setName] = useState(provider?.name ?? "");
  const [issuerUrl, setIssuerUrl] = useState(provider?.issuerUrl ?? "");
  const [entryPoint, setEntryPoint] = useState(provider?.entryPoint ?? "");
  const [certificate, setCertificate] = useState(provider?.certificate ?? "");
  const [clientId, setClientId] = useState(provider?.clientId ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [attributeMappings, setAttributeMappings] = useState(
    provider?.attributeMappings ? JSON.stringify(provider.attributeMappings, null, 2) : "{}",
  );
  const [autoProvisioning, setAutoProvisioning] = useState(provider?.autoProvisioning ?? false);
  const [ssoEnforced, setSsoEnforced] = useState(provider?.ssoEnforced ?? false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!provider;

  function validate(): string | null {
    if (!name.trim()) return "Le nom est requis";
    if (type === "saml" && !issuerUrl.trim()) return "L'URL d'émetteur est requise";
    if (type === "oidc" && !clientId.trim()) return "Le Client ID est requis";
    // Validate attribute mappings JSON
    try {
      JSON.parse(attributeMappings);
    } catch {
      return "Les mappings d'attributs ne sont pas un JSON valide";
    }
    return null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const data: SsoProviderConfig = {
      name: name.trim(),
      type,
      ...(type === "saml" ? {
        issuerUrl: issuerUrl.trim() || undefined,
        entryPoint: entryPoint.trim() || undefined,
        certificate: certificate || undefined,
      } : {
        clientId: clientId.trim(),
        clientSecret: clientSecret || undefined,
        issuerUrl: issuerUrl.trim() || undefined,
      }),
      attributeMappings: JSON.parse(attributeMappings),
      autoProvisioning,
      ssoEnforced,
    };
    await onSave(data);
  }

  async function handleTest() {
    if (!provider?.id || !onTest) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(provider.id);
      setTestResult(result);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || "Échec de connexion au fournisseur SSO" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={handleSave}>
      <GlassCard className="p-6 space-y-6">
        {/* Protocol type selector */}
        <div>
          <Label className="mb-2 block">Type de protocole</Label>
          <Tabs value={type} onValueChange={(v) => setType(v as "saml" | "oidc")}>
            <TabsList>
              <TabsTrigger value="saml">SAML 2.0</TabsTrigger>
              <TabsTrigger value="oidc">OpenID Connect (OIDC)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Name */}
        <div>
          <Label htmlFor="sso-name">
            Nom du fournisseur <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sso-name"
            placeholder="Ex: Azure AD - Entreprise"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* SAML fields */}
        {type === "saml" && (
          <>
            <div>
              <Label htmlFor="issuer-url">
                URL d'émetteur <span className="text-destructive">*</span>
              </Label>
              <Input
                id="issuer-url"
                placeholder="https://sts.windows.net/..."
                value={issuerUrl}
                onChange={(e) => setIssuerUrl(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="entry-point">URL ACS (Entry Point)</Label>
              <Input
                id="entry-point"
                placeholder="https://vaultos.local/api/auth/saml"
                value={entryPoint}
                onChange={(e) => setEntryPoint(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="certificate">Certificat x509</Label>
              <textarea
                id="certificate"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="-----BEGIN CERTIFICATE-----..."
                value={certificate}
                onChange={(e) => setCertificate(e.target.value)}
              />
            </div>
          </>
        )}

        {/* OIDC fields */}
        {type === "oidc" && (
          <>
            <div>
              <Label htmlFor="client-id">
                Client ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client-id"
                placeholder="your-client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="client-secret">Client Secret</Label>
              <Input
                id="client-secret"
                type="password"
                placeholder={isEditing ? "••••••••" : "Entrez le secret"}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
              {isEditing && !clientSecret && (
                <p className="mt-1 text-[10px] text-muted-foreground">Laissez vide pour conserver la valeur existante</p>
              )}
            </div>
            <div>
              <Label htmlFor="oidc-issuer">URL d'émetteur</Label>
              <Input
                id="oidc-issuer"
                placeholder="https://accounts.google.com"
                value={issuerUrl}
                onChange={(e) => setIssuerUrl(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Attribute mappings */}
        <div>
          <Label htmlFor="attr-mappings">Mappings d'attributs (JSON)</Label>
          <textarea
            id="attr-mappings"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={attributeMappings}
            onChange={(e) => setAttributeMappings(e.target.value)}
          />
        </div>

        {/* Toggles */}
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <Switch checked={autoProvisioning} onCheckedChange={setAutoProvisioning} />
            <div>
              <p className="text-sm font-medium">Activer le provisionnement automatique</p>
              <p className="text-xs text-muted-foreground">Crée automatiquement les comptes utilisateurs lors de la première connexion SSO</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <Switch checked={ssoEnforced} onCheckedChange={setSsoEnforced} />
            <div>
              <p className="text-sm font-medium">Forcer la connexion SSO</p>
              <p className="text-xs text-muted-foreground">Masque le formulaire de connexion par mot de passe</p>
            </div>
          </label>
        </div>

        {/* Test connection */}
        {isEditing && onTest && (
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Test en cours...</>
              ) : (
                "Tester la connexion"
              )}
            </Button>
            {testResult && (
              <div className={`mt-2 flex items-center gap-2 text-sm ${
                testResult.success ? "text-success" : "text-destructive"
              }`}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResult.message}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Sauvegarder"}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          )}
        </div>
      </GlassCard>
    </form>
  );
}
