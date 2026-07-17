"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n/context";
import {
  fetchCredential,
  fetchAccessLevels,
  deleteAccessLevel,
  generateCredentialQr,
  deactivateCredential,
  type CredentialDto,
  type AccessLevelDto,
} from "@/lib/api";
import { ArrowLeft, Trash2, QrCode, ShieldCheck } from "lucide-react";

const typeLabels: Record<string, string> = {
  BADGE: "Badge",
  PIN: "PIN",
  MOBILE: "Mobile",
  QR: "QR",
};

export default function CredentialDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [credential, setCredential] = useState<CredentialDto | null>(null);
  const [accessLevels, setAccessLevels] = useState<AccessLevelDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [cred, levels] = await Promise.all([
          fetchCredential(id),
          fetchAccessLevels(id),
        ]);
        setCredential(cred);
        setAccessLevels(levels);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleGenerateQr = async () => {
    try {
      const result = await generateCredentialQr(id);
      setQrDataUrl(result.qrDataUrl);
    } catch (err: any) {
      // ignore
    }
  };

  const handleRemoveAccessLevel = async (levelId: string) => {
    try {
      await deleteAccessLevel(levelId);
      setAccessLevels((prev) => prev.filter((l) => l.id !== levelId));
    } catch (err: any) {
      // ignore
    }
  };

  const handleDeactivate = async () => {
    if (!credential) return;
    if (confirm("Désactiver ce justificatif ?")) {
      try {
        await deactivateCredential(credential.id);
        setCredential({ ...credential, isActive: false });
      } catch (err: any) {
        // ignore
      }
    }
  };

  const userFullName = credential
    ? `${credential.user?.firstName || ""} ${credential.user?.lastName || ""}`.trim()
    : "";

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('common.loading')} description="" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !credential) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('access.detailTitle')}
          description=""
          action={{
            label: t('common.back'),
            icon: ArrowLeft,
            onClick: () => router.push("/acces"),
          }}
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">{error || t('common.noData')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${userFullName} - ${typeLabels[credential.type] || credential.type}`}
        description="Détails et niveaux d'accès du justificatif"
      />

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => router.push("/acces")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
        {credential.isActive && (
          <Button variant="destructive" onClick={handleDeactivate}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t('access.deactivate')}
          </Button>
        )}
      </div>

      {/* Credential Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Détails du justificatif
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Type</dt>
              <dd className="mt-1 text-sm">
                {typeLabels[credential.type] || credential.type}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Identifiant</dt>
              <dd className="mt-1 text-sm font-mono">
                {credential.badgeNumber ||
                  credential.qrSeed?.substring(0, 12) ||
                  "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Statut</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    credential.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {credential.isActive ? "Actif" : "Inactif"}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Utilisateur</dt>
              <dd className="mt-1 text-sm">
                {userFullName} ({credential.user?.email})
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Valide à partir du
              </dt>
              <dd className="mt-1 text-sm">
                {credential.validFrom
                  ? new Date(credential.validFrom).toLocaleDateString("fr")
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Valide jusqu'au
              </dt>
              <dd className="mt-1 text-sm">
                {credential.validUntil
                  ? new Date(credential.validUntil).toLocaleDateString("fr")
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Utilisation</dt>
              <dd className="mt-1 text-sm">
                {credential.useCount}
                {credential.maxUses ? ` / ${credential.maxUses}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Créé le</dt>
              <dd className="mt-1 text-sm">
                {new Date(credential.createdAt).toLocaleDateString("fr")}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* QR Code for QR-type credentials */}
      {credential.type === "QR" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="rounded-lg border"
              />
            ) : (
              <Button onClick={handleGenerateQr}>
                <QrCode className="mr-2 h-4 w-4" />
                Générer le QR code
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Access Levels */}
      <Card>
        <CardHeader>
          <CardTitle>Niveaux d'accès</CardTitle>
        </CardHeader>
        <CardContent>
          {accessLevels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun niveau d'accès défini
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">Zone</th>
                    <th className="py-2 text-left font-medium">Planning</th>
                    <th className="py-2 text-left font-medium">Priorité</th>
                    <th className="py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accessLevels.map((level) => (
                    <tr key={level.id} className="border-b last:border-0">
                      <td className="py-2">{level.zone?.name || level.zoneId}</td>
                      <td className="py-2">
                        {level.schedule?.name || level.scheduleId}
                      </td>
                      <td className="py-2">{level.priority}</td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-800"
                          onClick={() => handleRemoveAccessLevel(level.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
