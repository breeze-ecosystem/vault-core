"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchVisitor,
  checkInVisit,
  checkOutVisit,
  cancelVisit,
  type VisitorDto,
  type VisitDto,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import { ArrowLeft, LogIn, LogOut, XCircle, Mail, Phone, Building2, Calendar } from "lucide-react";

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

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function VisitorDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [visitor, setVisitor] = useState<(VisitorDto & { visits: VisitDto[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadVisitor = async () => {
    setLoading(true);
    try {
      const data = await fetchVisitor(id);
      setVisitor(data);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisitor();
  }, [id]);

  const handleCheckIn = async (visitId: string) => {
    setActionLoading(visitId);
    try {
      await checkInVisit(visitId);
      await loadVisitor();
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async (visitId: string) => {
    setActionLoading(visitId);
    try {
      await checkOutVisit(visitId);
      await loadVisitor();
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (visitId: string) => {
    setActionLoading(visitId);
    try {
      await cancelVisit(visitId);
      await loadVisitor();
    } catch {
      // Error handled silently
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">{t("common.loading")}</div>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-6">
          <h1 className="text-2xl font-bold tracking-tight">{t("visitors.detail.title")}</h1>
          <Button variant="outline" onClick={() => router.push("/visiteurs")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Button>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            {t("visitors.noVisitors")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("visitors.detail.title")}</h1>
        <Button variant="outline" onClick={() => router.push("/visiteurs")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.back")}
        </Button>
      </div>

      {/* Visitor Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("visitors.visitorInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-lg font-semibold">
                {visitor.firstName} {visitor.lastName}
              </div>
              {visitor.email && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Mail className="h-4 w-4" />
                  {visitor.email}
                </div>
              )}
              {visitor.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Phone className="h-4 w-4" />
                  {visitor.phone}
                </div>
              )}
              {visitor.company && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Building2 className="h-4 w-4" />
                  {visitor.company}
                </div>
              )}
            </div>
            <div className="space-y-1 text-right text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-end gap-2">
                <Calendar className="h-4 w-4" />
                {t("visitors.detail.memberSince")}: {formatShortDate(visitor.createdAt)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visit History */}
      <Card>
        <CardHeader>
          <CardTitle>{t("visitors.detail.visitHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          {visitor.visits.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {t("visitors.detail.noVisits")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.status")}</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.purpose")}</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.validFrom")}</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.validUntil")}</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.table.checkIn")}</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.table.checkOut")}</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">{t("visitors.table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {visitor.visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
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
                        {visit.purpose || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {formatDate(visit.validFrom)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {formatDate(visit.validUntil)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {visit.checkedInAt ? formatDate(visit.checkedInAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {visit.checkedOutAt ? formatDate(visit.checkedOutAt) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
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
