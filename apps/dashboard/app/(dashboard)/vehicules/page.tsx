"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  fetchVehicleEvents,
  fetchVehicleList,
  type VehicleEventDto,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import { Search, Plus, ChevronLeft, ChevronRight, Car } from "lucide-react";

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

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return "text-green-600 dark:text-green-400";
  if (confidence >= 0.7) return "text-orange-500 dark:text-orange-400";
  return "text-red-500 dark:text-red-400";
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

export default function VehiclesPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"events" | "lists">("events");

  // Events state
  const [events, setEvents] = useState<VehicleEventDto[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [plateSearch, setPlateSearch] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [eventsLoading, setEventsLoading] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Lists summary state
  const [allowlistCount, setAllowlistCount] = useState(0);
  const [blocklistCount, setBlocklistCount] = useState(0);

  const pageSize = 20;

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const result = await fetchVehicleEvents({
        plate: plateSearch || undefined,
        decision: decisionFilter || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        page: eventsPage,
        limit: pageSize,
      });
      setEvents(result.data);
      setEventsTotal(result.total);
    } catch {
      setEvents([]);
      setEventsTotal(0);
    } finally {
      setEventsLoading(false);
    }
  }, [plateSearch, decisionFilter, dateFrom, dateTo, eventsPage]);

  const loadListCounts = useCallback(async () => {
    try {
      const [allowlist, blocklist] = await Promise.all([
        fetchVehicleList("allowlist"),
        fetchVehicleList("blocklist"),
      ]);
      setAllowlistCount(allowlist.length);
      setBlocklistCount(blocklist.length);
    } catch {
      setAllowlistCount(0);
      setBlocklistCount(0);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "events") {
      loadEvents();
    } else {
      loadListCounts();
    }
  }, [activeTab, loadEvents, loadListCounts]);

  const totalPages = Math.ceil(eventsTotal / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("vehicles.title")}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        <button
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === "events"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
          onClick={() => setActiveTab("events")}
        >
          {t("vehicles.tabs.events")}
        </button>
        <button
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === "lists"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
          onClick={() => setActiveTab("lists")}
        >
          {t("vehicles.tabs.lists")}
        </button>
      </div>

      {/* Tab: Events */}
      {activeTab === "events" && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-9"
                placeholder={t("vehicles.searchByPlate")}
                value={plateSearch}
                onChange={(e) => {
                  setPlateSearch(e.target.value);
                  setEventsPage(1);
                }}
              />
            </div>
            <input
              type="date"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setEventsPage(1);
              }}
              title={t("common.from")}
            />
            <input
              type="date"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setEventsPage(1);
              }}
              title={t("common.to")}
            />
            <select
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={decisionFilter}
              onChange={(e) => {
                setDecisionFilter(e.target.value);
                setEventsPage(1);
              }}
            >
              <option value="">{t("common.all") || "Tous"}</option>
              <option value="ALLOW">{t("vehicles.decisions.ALLOW")}</option>
              <option value="DENY">{t("vehicles.decisions.DENY")}</option>
              <option value="UNKNOWN">{t("vehicles.decisions.UNKNOWN")}</option>
            </select>
          </div>

          {/* Events Table */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    {t("vehicles.timestamp")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    {t("vehicles.plate")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    {t("vehicles.confidence")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    {t("vehicles.decision")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    {t("vehicles.reason")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    {t("vehicles.camera")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {eventsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {t("vehicles.noEvents")}
                    </td>
                  </tr>
                ) : (
                  events.map((evt, idx) => (
                    <>
                      <tr
                        key={`${evt.time}-${evt.plate}-${idx}`}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        onClick={() =>
                          setExpandedEvent(
                            expandedEvent === `${evt.time}-${evt.plate}-${idx}`
                              ? null
                              : `${evt.time}-${evt.plate}-${idx}`,
                          )
                        }
                      >
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {formatDate(evt.time)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/vehicules/${evt.plate}`);
                            }}
                          >
                            {evt.plate}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {evt.confidence != null ? (
                            <span className={`font-medium ${getConfidenceColor(evt.confidence)}`}>
                              {(evt.confidence * 100).toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <DecisionBadge decision={evt.decision} />
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {evt.reason || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                          {evt.cameraId ? evt.cameraId.substring(0, 8) + "..." : "—"}
                        </td>
                      </tr>
                      {/* Expanded detail row */}
                      {expandedEvent === `${evt.time}-${evt.plate}-${idx}` && (
                        <tr key={`detail-${evt.time}-${evt.plate}-${idx}`}>
                          <td colSpan={6} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/30">
                            <div className="text-sm space-y-1">
                              {evt.imageUrl && (
                                <div>
                                  <span className="font-medium text-gray-500">URL image:</span>{" "}
                                  <a
                                    href={evt.imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    {evt.imageUrl}
                                  </a>
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-gray-500">Site ID:</span>{" "}
                                <span className="font-mono text-xs">{evt.siteId}</span>
                              </div>
                              {evt.cameraId && (
                                <div>
                                  <span className="font-medium text-gray-500">Camera ID:</span>{" "}
                                  <span className="font-mono text-xs">{evt.cameraId}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {eventsTotal} résultat{(eventsTotal > 1) ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEventsPage((p) => Math.max(1, p - 1))}
                  disabled={eventsPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {eventsPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEventsPage((p) => Math.min(totalPages, p + 1))}
                  disabled={eventsPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Lists */}
      {activeTab === "lists" && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                  <Car className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("vehicles.lists.allowlist")}
                  </p>
                  <p className="text-2xl font-bold">{allowlistCount}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                  <Car className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("vehicles.lists.blocklist")}
                  </p>
                  <p className="text-2xl font-bold">{blocklistCount}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                  <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total événements</p>
                  <p className="text-2xl font-bold">{eventsTotal}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-3">
            <Button
              variant="default"
              onClick={() => router.push("/vehicules/listes")}
            >
              {t("vehicles.lists.addToAllowlist")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => router.push("/vehicules/listes")}
            >
              {t("vehicles.lists.addToBlocklist")}
            </Button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            <button
              className="text-blue-600 dark:text-blue-400 hover:underline"
              onClick={() => router.push("/vehicules/listes")}
            >
              {t("common.viewAll") || "Voir tout"}
            </button>{" "}
            — {t("vehicles.lists.noEntries")}
          </p>
        </div>
      )}
    </div>
  );
}
