"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchVehicleEvents,
  fetchVehicleList,
  type VehicleEventDto,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import { ArrowLeft, Car, Plus, ChevronLeft, ChevronRight } from "lucide-react";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DecisionBadge({ decision }: { decision: string }) {
  const { t } = useTranslation();
  const variantMap: Record<string, "success" | "destructive" | "secondary"> = {
    ALLOW: "success",
    DENY: "destructive",
    UNKNOWN: "secondary",
  };
  return (
    <Badge variant={variantMap[decision] || "secondary"}>
      {t(`vehicles.decisions.${decision}` as any) || decision}
    </Badge>
  );
}

export default function VehicleDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const plate = params.id as string;

  const [events, setEvents] = useState<VehicleEventDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [allowlistCount, setAllowlistCount] = useState(0);
  const [blocklistCount, setBlocklistCount] = useState(0);

  const pageSize = 50;

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchVehicleEvents({
        plate,
        page,
        limit: pageSize,
      });
      setEvents(result.data);
      setTotal(result.total);
    } catch {
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [plate, page]);

  const loadListStatus = useCallback(async () => {
    try {
      const [allowlist, blocklist] = await Promise.all([
        fetchVehicleList("allowlist"),
        fetchVehicleList("blocklist"),
      ]);
      setAllowlistCount(
        allowlist.filter((e) => e.plate === plate && e.isActive).length,
      );
      setBlocklistCount(
        blocklist.filter((e) => e.plate === plate && e.isActive).length,
      );
    } catch {
      // Ignore
    }
  }, [plate]);

  useEffect(() => {
    loadEvents();
    loadListStatus();
  }, [loadEvents, loadListStatus]);

  const firstSeen = events.length > 0 ? events[events.length - 1] : null;
  const lastSeen = events.length > 0 ? events[0] : null;
  const lastDecision = lastSeen?.decision || "";

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/vehicules")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t("common.back")}
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="font-mono">{plate}</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} événement{total > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("vehicles.detail.firstSeen")}
          </p>
          <p className="text-lg font-semibold mt-1">
            {firstSeen ? formatDateShort(firstSeen.time) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("vehicles.detail.lastSeen")}
          </p>
          <p className="text-lg font-semibold mt-1">
            {lastSeen ? formatDateShort(lastSeen.time) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("vehicles.detail.totalEvents")}
          </p>
          <p className="text-lg font-semibold mt-1">{total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("vehicles.detail.lastDecision")}
          </p>
          <p className="text-lg font-semibold mt-1">
            {lastDecision ? (
              <DecisionBadge decision={lastDecision} />
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button
          variant="default"
          onClick={() => router.push("/vehicules/listes")}
          disabled={allowlistCount > 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("vehicles.lists.addToAllowlist")}
        </Button>
        <Button
          variant="destructive"
          onClick={() => router.push("/vehicules/listes")}
          disabled={blocklistCount > 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("vehicles.lists.addToBlocklist")}
        </Button>
      </div>

      {/* Event Timeline */}
      <h2 className="text-lg font-semibold">{t("vehicles.events")}</h2>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500">{t("common.loading")}</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{t("vehicles.noEvents")}</div>
        ) : (
          events.map((evt, idx) => (
            <div
              key={`${evt.time}-${idx}`}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DecisionBadge decision={evt.decision} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(evt.time)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {evt.confidence != null && (
                    <span className="text-sm font-medium">
                      Confiance: {(evt.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                  {evt.reason && (
                    <Badge variant="outline">{evt.reason}</Badge>
                  )}
                </div>
              </div>
              {(evt.imageUrl || evt.cameraId) && (
                <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  {evt.cameraId && <span>Caméra: {evt.cameraId} </span>}
                  {evt.imageUrl && (
                    <a
                      href={evt.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline ml-2"
                    >
                      Voir l'image
                    </a>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {total} résultat{(total > 1) ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
