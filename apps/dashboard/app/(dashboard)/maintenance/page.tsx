"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import {
  fetchUnifiedIncidents,
  fetchMaintenanceTickets,
  type UnifiedIncidentDto,
  type MaintenanceTicketDto,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import { Wrench, AlertTriangle } from "lucide-react";

const severityColors: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  LOW: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  INFO: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const typeColors: Record<string, string> = {
  SECURITY_INCIDENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  MAINTENANCE_TICKET: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  triage: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  investigating: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
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

export default function MaintenancePage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [ticketTypeFilter, setTicketTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Summary counts
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [openIncidentsCount, setOpenIncidentsCount] = useState(0);
  const [autoCreatedToday, setAutoCreatedToday] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);

  // Fetch summary data
  useEffect(() => {
    async function loadSummary() {
      try {
        const [tickets, incidents] = await Promise.all([
          fetchMaintenanceTickets({ status: "open" }),
          fetchUnifiedIncidents({ ticketType: "SECURITY_INCIDENT", status: "open" }),
        ]);
        setOpenTicketsCount(tickets.total);
        setOpenIncidentsCount(incidents.total);

        // Count unassigned open maintenance tickets
        const allOpenTickets = await fetchMaintenanceTickets({ status: "open", limit: 100 });
        const unassigned = allOpenTickets.data.filter((t) => !t.assignedToId).length;
        setUnassignedCount(unassigned);
      } catch {
        // Summary load is non-critical
      }
    }
    loadSummary();
  }, [refreshKey]);

  // Type filter label
  const typeFilterLabel = ticketTypeFilter === "MAINTENANCE_TICKET"
    ? "maintenance"
    : ticketTypeFilter === "SECURITY_INCIDENT"
      ? "incident"
      : "all";

  const columns = [
    {
      key: "ticketType",
      label: t("maintenance.table.type"),
      render: (item: UnifiedIncidentDto) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            typeColors[item.ticketType] || "bg-gray-100 text-gray-800"
          }`}
        >
          {item.ticketType === "MAINTENANCE_TICKET"
            ? t("maintenance.type.MAINTENANCE_TICKET")
            : t("maintenance.type.SECURITY_INCIDENT")}
        </span>
      ),
    },
    {
      key: "title",
      label: t("maintenance.table.title"),
      render: (item: UnifiedIncidentDto) => (
        <span className="font-medium">{item.title}</span>
      ),
    },
    {
      key: "severity",
      label: t("maintenance.table.severity"),
      render: (item: UnifiedIncidentDto) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            severityColors[item.severity] || "bg-gray-100 text-gray-800"
          }`}
        >
          {item.severity}
        </span>
      ),
    },
    {
      key: "status",
      label: t("maintenance.table.status"),
      render: (item: UnifiedIncidentDto) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            statusColors[item.status] || "bg-gray-100 text-gray-800"
          }`}
        >
          {t(`maintenance.statuses.${item.status}`) || item.status}
        </span>
      ),
    },
    {
      key: "device",
      label: t("maintenance.table.device"),
      render: (item: UnifiedIncidentDto) => (
        <span className="text-sm text-muted-foreground">
          {item.deviceType
            ? `${t(`maintenance.deviceTypes.${item.deviceType}`) || item.deviceType}${item.deviceName ? ` — ${item.deviceName}` : ""}`
            : "—"}
        </span>
      ),
    },
    {
      key: "assignedTo",
      label: t("maintenance.table.assignedTo"),
      render: (item: UnifiedIncidentDto) => (
        <span className="text-sm text-muted-foreground">
          {item.assignedToName || "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: t("maintenance.table.createdAt"),
      render: (item: UnifiedIncidentDto) => (
        <span className="text-sm text-muted-foreground">
          {timeAgo(item.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (item: UnifiedIncidentDto) => (
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
        title={t("maintenance.title")}
        description="Suivez les tickets de maintenance et incidents de sécurité"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-2">
            <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{openTicketsCount}</p>
            <p className="text-xs text-muted-foreground">{t("maintenance.summary.openTickets")}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-2">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{openIncidentsCount}</p>
            <p className="text-xs text-muted-foreground">{t("maintenance.summary.openIncidents")}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
            <Wrench className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{autoCreatedToday}</p>
            <p className="text-xs text-muted-foreground">{t("maintenance.summary.autoCreatedToday")}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <div className="rounded-full bg-gray-100 dark:bg-gray-700 p-2">
            <Wrench className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{unassignedCount}</p>
            <p className="text-xs text-muted-foreground">{t("maintenance.summary.unassigned")}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Ticket type toggle */}
        <div className="flex rounded-md border border-input overflow-hidden">
          <button
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              ticketTypeFilter === "" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
            }`}
            onClick={() => { setTicketTypeFilter(""); setRefreshKey((k) => k + 1); }}
          >
            {t("maintenance.filters.all")}
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-x border-input ${
              ticketTypeFilter === "SECURITY_INCIDENT" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
            }`}
            onClick={() => { setTicketTypeFilter("SECURITY_INCIDENT"); setRefreshKey((k) => k + 1); }}
          >
            {t("maintenance.filters.securityIncidents")}
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              ticketTypeFilter === "MAINTENANCE_TICKET" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
            }`}
            onClick={() => { setTicketTypeFilter("MAINTENANCE_TICKET"); setRefreshKey((k) => k + 1); }}
          >
            {t("maintenance.filters.maintenanceTickets")}
          </button>
        </div>

        {/* Status filter */}
        <select
          className="rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setRefreshKey((k) => k + 1);
          }}
        >
          <option value="">{t("maintenance.filters.status")}</option>
          <option value="open">{t("maintenance.statuses.open")}</option>
          <option value="in_progress">{t("maintenance.statuses.in_progress")}</option>
          <option value="resolved">{t("maintenance.statuses.resolved")}</option>
          <option value="closed">{t("maintenance.statuses.closed")}</option>
        </select>

        {/* Device type filter (visible when maintenance filter active) */}
        {ticketTypeFilter === "MAINTENANCE_TICKET" && (
          <select
            className="rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={deviceTypeFilter}
            onChange={(e) => {
              setDeviceTypeFilter(e.target.value);
              setRefreshKey((k) => k + 1);
            }}
          >
            <option value="">{t("maintenance.filters.deviceType")}</option>
            <option value="camera">{t("maintenance.deviceTypes.camera")}</option>
            <option value="reader">{t("maintenance.deviceTypes.reader")}</option>
            <option value="controller">{t("maintenance.deviceTypes.controller")}</option>
          </select>
        )}
      </div>

      {/* Unified Incidents/Tickets Table */}
      <DataTable
        key={refreshKey}
        columns={columns}
        fetchFn={(params: any) =>
          fetchUnifiedIncidents({
            ...params,
            ...(ticketTypeFilter ? { ticketType: ticketTypeFilter } : {}),
            ...(statusFilter ? { status: statusFilter } : {}),
          })
        }
        onRowClick={(item: UnifiedIncidentDto) => router.push(`/incidents/${item.id}`)}
      />
    </div>
  );
}
