"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchVisits,
  fetchVisitors,
  checkInVisit,
  checkOutVisit,
  cancelVisit,
  type VisitDto,
  type VisitorDto,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import { toast } from "@/components/ui/toast";
import { Plus, LogIn, LogOut, XCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VisitorsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"visits" | "visitors">("visits");

  // Visits state
  const [visits, setVisits] = useState<VisitDto[]>([]);
  const [visitsTotal, setVisitsTotal] = useState(0);
  const [visitsPage, setVisitsPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Visitors state
  const [visitors, setVisitors] = useState<VisitorDto[]>([]);
  const [visitorsTotal, setVisitorsTotal] = useState(0);
  const [visitorsPage, setVisitorsPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [visitorsLoading, setVisitorsLoading] = useState(false);

  const pageSize = 20;

  const loadVisits = useCallback(async () => {
    setVisitsLoading(true);
    try {
      const result = await fetchVisits({
        status: statusFilter || undefined,
        page: visitsPage,
        limit: pageSize,
      });
      setVisits(result.data);
      setVisitsTotal(result.total);
    } catch (e: any) {
      toast(e.message || "Échec du chargement des visites", "error");
    } finally {
      setVisitsLoading(false);
    }
  }, [statusFilter, visitsPage]);

  const loadVisitors = useCallback(async () => {
    setVisitorsLoading(true);
    try {
      const result = await fetchVisitors({
        search: searchQuery || undefined,
        page: visitorsPage,
        limit: pageSize,
      });
      setVisitors(result.data);
      setVisitorsTotal(result.total);
    } catch (e: any) {
      toast(e.message || "Échec du chargement des visiteurs", "error");
    } finally {
      setVisitorsLoading(false);
    }
  }, [searchQuery, visitorsPage]);

  useEffect(() => {
    if (activeTab === "visits") loadVisits();
  }, [loadVisits, activeTab]);

  useEffect(() => {
    if (activeTab === "visitors") loadVisitors();
  }, [loadVisitors, activeTab]);

  const handleCheckIn = async (visitId: string) => {
    setActionLoading(visitId);
    try {
      await checkInVisit(visitId);
      await loadVisits();
    } catch (e: any) {
      toast(e.message || "Échec de l'enregistrement", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async (visitId: string) => {
    setActionLoading(visitId);
    try {
      await checkOutVisit(visitId);
      await loadVisits();
    } catch (e: any) {
      toast(e.message || "Échec de l'enregistrement", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (visitId: string) => {
    setActionLoading(visitId);
    try {
      await cancelVisit(visitId);
      await loadVisits();
    } catch (e: any) {
      toast(e.message || "Échec de l'annulation", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const visitsTotalPages = Math.ceil(visitsTotal / pageSize);
  const visitorsTotalPages = Math.ceil(visitorsTotal / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("visitors.title")}</h1>
        <Button onClick={() => router.push("/visiteurs/preinscription")}>
          <Plus className="mr-2 h-4 w-4" />
          {t("visitors.preregister")}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        <button
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === "visits"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
          onClick={() => setActiveTab("visits")}
        >
          {t("visitors.tabs.visits")}
        </button>
        <button
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === "visitors"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
          onClick={() => setActiveTab("visitors")}
        >
          {t("visitors.tabs.visitors")}
        </button>
      </div>

      {/* Tab: Visits */}
      {activeTab === "visits" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <select
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setVisitsPage(1);
              }}
            >
              <option value="">{t("common.all") || "Tous"}</option>
              <option value="scheduled">{t("visitors.statuses.scheduled")}</option>
              <option value="active">{t("visitors.statuses.active")}</option>
              <option value="completed">{t("visitors.statuses.completed")}</option>
              <option value="cancelled">{t("visitors.statuses.cancelled")}</option>
            </select>
          </div>

          {/* Visits Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.table.visitor")}</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.table.host")}</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.table.purpose")}</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.table.status")}</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.table.validFrom")}</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.table.validUntil")}</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {visitsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : visits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {t("visitors.noVisits")}
                    </td>
                  </tr>
                ) : (
                  visits.map((visit) => (
                    <tr
                      key={visit.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => router.push(`/visiteurs/${visit.visitorId}`)}
                    >
                      <td className="px-4 py-3 font-medium">
                        {visit.visitor ? `${visit.visitor.firstName} ${visit.visitor.lastName}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {visit.hostName || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {visit.purpose || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusColors[visit.status] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {t(`visitors.statuses.${visit.status}`) || visit.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {formatDate(visit.validFrom)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {formatDate(visit.validUntil)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {visit.status === "scheduled" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCheckIn(visit.id)}
                                disabled={actionLoading === visit.id}
                                title={t("visitors.checkIn")}
                              >
                                <LogIn className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancel(visit.id)}
                                disabled={actionLoading === visit.id}
                                title={t("visitors.cancel")}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {visit.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckOut(visit.id)}
                              disabled={actionLoading === visit.id}
                              title={t("visitors.checkOut")}
                            >
                              <LogOut className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {visitsTotalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {visitsTotal} {t("common.results") || "résultats"}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVisitsPage((p) => Math.max(1, p - 1))}
                  disabled={visitsPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex items-center px-2 text-gray-600 dark:text-gray-400">
                  {visitsPage} / {visitsTotalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVisitsPage((p) => Math.min(visitsTotalPages, p + 1))}
                  disabled={visitsPage >= visitsTotalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Visitors */}
      {activeTab === "visitors" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-10"
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisitorsPage(1);
              }}
            />
          </div>

          {/* Visitors Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.table.visitor")}</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.email")}</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.company")}</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.detail.visitHistory")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {visitorsLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : visitors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      {t("visitors.noVisitors")}
                    </td>
                  </tr>
                ) : (
                  visitors.map((visitor) => (
                    <tr
                      key={visitor.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => router.push(`/visiteurs/${visitor.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">
                        {visitor.firstName} {visitor.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {visitor.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {visitor.company || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {(visitor as any).visitCount || 0} visites
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {visitorsTotalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {visitorsTotal} {t("common.results") || "résultats"}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVisitorsPage((p) => Math.max(1, p - 1))}
                  disabled={visitorsPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex items-center px-2 text-gray-600 dark:text-gray-400">
                  {visitorsPage} / {visitorsTotalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVisitorsPage((p) => Math.min(visitorsTotalPages, p + 1))}
                  disabled={visitorsPage >= visitorsTotalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
