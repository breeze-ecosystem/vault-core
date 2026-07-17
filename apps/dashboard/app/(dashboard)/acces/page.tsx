"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import {
  fetchCredentials,
  deactivateCredential,
  type CredentialDto,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import { toast } from "@/components/ui/toast";
import { Plus } from "lucide-react";

const typeLabels: Record<string, string> = {
  BADGE: "Badge",
  PIN: "PIN",
  MOBILE: "Mobile",
  QR: "QR",
};

const typeColors: Record<string, string> = {
  BADGE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PIN: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  MOBILE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  QR: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export default function AccesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const columns = [
    {
      key: "user",
      label: "Utilisateur",
      render: (item: CredentialDto) => (
        <span>
          {item.user?.firstName} {item.user?.lastName}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (item: CredentialDto) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            typeColors[item.type] || "bg-gray-100 text-gray-800"
          }`}
        >
          {typeLabels[item.type] || item.type}
        </span>
      ),
    },
    {
      key: "identifier",
      label: "Identifiant",
      render: (item: CredentialDto) => (
        <span className="font-mono text-sm">
          {item.badgeNumber ||
            (item.pinHash ? item.pinHash.substring(0, 8) + "..." : null) ||
            (item.qrSeed ? item.qrSeed.substring(0, 8) + "..." : null) ||
            "-"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Statut",
      render: (item: CredentialDto) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            item.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {item.isActive ? "Actif" : "Inactif"}
        </span>
      ),
    },
    {
      key: "validity",
      label: "Validité",
      render: (item: CredentialDto) => (
        <span className="text-sm text-muted-foreground">
          {item.validFrom
            ? new Date(item.validFrom).toLocaleDateString("fr")
            : "-"}
          {" → "}
          {item.validUntil
            ? new Date(item.validUntil).toLocaleDateString("fr")
            : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (item: CredentialDto) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/acces/${item.id}`);
            }}
          >
            {t('common.edit')}
          </Button>
          {item.isActive && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-800"
              onClick={async (e) => {
                e.stopPropagation();
                  if (confirm("Désactiver ce justificatif ?")) {
                    try {
                      await deactivateCredential(item.id);
                      setRefreshKey((k) => k + 1);
                    } catch (err: any) {
                      toast(err.message || "Échec de la désactivation", "error");
                    }
                  }
              }}
            >
              Désactiver
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des accès"
        description="Gérez les justificatifs d'accès, badges, PINs et QR codes"
        action={{
          label: "Nouveau",
          icon: Plus,
          onClick: () => router.push("/acces/nouveau"),
        }}
      />

      <div className="flex items-center gap-2">
        <select
          className="rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setRefreshKey((k) => k + 1);
          }}
        >
          <option value="">Tous les types</option>
          <option value="BADGE">{typeLabels.BADGE}</option>
          <option value="PIN">{typeLabels.PIN}</option>
          <option value="MOBILE">{typeLabels.MOBILE}</option>
          <option value="QR">{typeLabels.QR}</option>
        </select>
      </div>

      <DataTable
        key={refreshKey}
        columns={columns}
        fetchFn={(params: any) =>
          fetchCredentials({
            ...params,
            ...(typeFilter ? { type: typeFilter } : {}),
          })
        }
        onRowClick={(item: CredentialDto) => router.push(`/acces/${item.id}`)}
      />
    </div>
  );
}
