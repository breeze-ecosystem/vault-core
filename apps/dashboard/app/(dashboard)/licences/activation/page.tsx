"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LicenseActivationForm } from "@/components/license-activation-form";
import { activateLicense } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { CheckCircle } from "lucide-react";

export default function LicenseActivationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate(jwt: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await activateLicense(jwt);
      setResult(res);
      toast("Licence activée avec succès", "success");
    } catch (e: any) {
      setError(e.message || "Clé de licence invalide. Vérifiez la clé et réessayez, ou contactez votre administrateur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activer votre licence"
        description="Collez la clé JWT fournie par votre administrateur pour activer votre licence Oversight Hub."
      />

      <Card>
        <CardContent className="p-6">
          <LicenseActivationForm
            onSubmit={handleActivate}
            loading={loading}
            error={error}
            result={result}
          />
        </CardContent>
      </Card>
    </div>
  );
}
