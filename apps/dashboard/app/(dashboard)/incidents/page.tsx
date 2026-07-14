"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import {
  fetchIncidents,
  type IncidentDto,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import { Plus } from "lucide-react";

const severityColors: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  LOW: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  INFO: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  triage: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  investigating: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 30) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr");
}

export default function IncidentsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const columns = [
    {
      key: "severity",
      label: t("incidents.severity"),
      render: (item: IncidentDto) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            severityColors[item.severity] || "bg-gray-100 text-gray-800"
          }`}
        >
          {t(`incidents.severities.${item.severity}`) || item.severity}
        </span>
      ),
    },
    {
      key: "title",
      label: t("incidents.titleField"),
      render: (item: IncidentDto) => (
        <span className="font-medium">{item.title}</span>
      ),
    },
    {
      key: "status",
      label: t("incidents.status"),
      render: (item: IncidentDto) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            statusColors[item.status] || "bg-gray-100 text-gray-800"
          }`}
        >
          {t(`incidents.statuses.${item.status}`) || item.status}
        </span>
      ),
    },
    {
      key: "assignee",
      label: t("incidents.assignedTo"),
      render: (item: IncidentDto) => (
        <span className="text-sm text-muted-foreground">
          {item.assignedTo
            ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}`
            : t("incidents.unassigned")}
        </span>
      ),
    },
    {
      key: "age",
      label: "Créé",
      render: (item: IncidentDto) => (
        <span className="text-sm text-muted-foreground">
          {timeAgo(item.createdAt)}
        </span>
      ),
    },
    {
      key: "comments",
      label: "Commentaires",
      render: (item: IncidentDto) => (
        <span className="text-sm text-muted-foreground">
          {item._count?.comments ?? 0}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (item: IncidentDto) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/incidents/${item.id}`);
            }}
          >
            Détails
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("incidents.title")}
        description="Suivez et gérez les incidents de sécurité"
        action={{
          label: t("incidents.new"),
          icon: Plus,
          onClick: () => router.push("/incidents/nouveau"),
        }}
      />

      <div className="flex items-center gap-2">
        <select
          className="rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setRefreshKey((k) => k + 1);
          }}
        >
          <option value="">{t("incidents.filters.all")}</option>
          <option value="open">{t("incidents.statuses.open")}</option>
          <option value="triage">{t("incidents.statuses.triage")}</option>
          <option value="investigating">{t("incidents.statuses.investigating")}</option>
          <option value="resolved">{t("incidents.statuses.resolved")}</option>
          <option value="closed">{t("incidents.statuses.closed")}</option>
        </select>

        <select
          className="rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={severityFilter}
          onChange={(e) => {
            setSeverityFilter(e.target.value);
            setRefreshKey((k) => k + 1);
          }}
        >
          <option value="">{t("incidents.filters.bySeverity")}</option>
          <option value="CRITICAL">{t("incidents.severities.CRITICAL")}</option>
          <option value="HIGH">{t("incidents.severities.HIGH")}</option>
          <option value="MEDIUM">{t("incidents.severities.MEDIUM")}</option>
          <option value="LOW">{t("incidents.severities.LOW")}</option>
          <option value="INFO">{t("incidents.severities.INFO")}</option>
        </select>
      </div>

      <DataTable
        key={refreshKey}
        columns={columns}
        fetchFn={(params: any) =>
          fetchIncidents({
            ...params,
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(severityFilter ? { severity: severityFilter } : {}),
          })
        }
        onRowClick={(item: IncidentDto) => router.push(`/incidents/${item.id}`)}
      />
    </div>
  );
}
