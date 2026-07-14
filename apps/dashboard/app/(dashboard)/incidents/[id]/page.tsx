"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  fetchIncident,
  fetchIncidentComments,
  fetchIncidentHistory,
  updateIncidentStatus,
  assignIncident,
  addIncidentComment,
  fetchUsers,
  type IncidentDto,
  type IncidentCommentDto,
  type IncidentHistoryDto,
  type DashboardUser,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  UserCheck,
  Send,
  Loader2,
} from "lucide-react";

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

interface ValidTransition {
  status: string;
  label: string;
  icon: typeof AlertTriangle;
  variant: "default" | "destructive" | "outline" | "secondary";
}

function getValidTransitions(currentStatus: string, t: any): ValidTransition[] {
  switch (currentStatus) {
    case "open":
      return [
        { status: "triage", label: t("incidents.actions.takeCharge"), icon: UserCheck, variant: "default" as const },
        { status: "closed", label: t("incidents.actions.close"), icon: CheckCircle2, variant: "destructive" as const },
      ];
    case "triage":
      return [
        { status: "investigating", label: t("incidents.actions.investigate"), icon: AlertTriangle, variant: "default" as const },
        { status: "closed", label: t("incidents.actions.close"), icon: CheckCircle2, variant: "destructive" as const },
      ];
    case "investigating":
      return [
        { status: "resolved", label: t("incidents.actions.resolve"), icon: CheckCircle2, variant: "default" as const },
      ];
    case "resolved":
      return [
        { status: "closed", label: t("incidents.actions.close"), icon: CheckCircle2, variant: "default" as const },
        { status: "investigating", label: t("incidents.actions.reopen"), icon: AlertTriangle, variant: "outline" as const },
      ];
    default:
      return [];
  }
}

function getSlaStatus(incident: IncidentDto): { label: string; color: string } {
  if (!incident.assignedAt || incident.status === "closed" || incident.status === "resolved") {
    return { label: "", color: "" };
  }
  const assignedAt = new Date(incident.assignedAt).getTime();
  const elapsed = Date.now() - assignedAt;
  const slaMs = incident.slaMinutes * 60 * 1000;
  const ratio = elapsed / slaMs;

  if (ratio >= 1) return { label: "SLA dépassé", color: "text-red-600" };
  if (ratio >= 0.8) return { label: "SLA proche", color: "text-yellow-600" };
  return { label: "Dans les délais", color: "text-green-600" };
}

export default function IncidentDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [incident, setIncident] = useState<IncidentDto | null>(null);
  const [comments, setComments] = useState<IncidentCommentDto[]>([]);
  const [history, setHistory] = useState<IncidentHistoryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [transitioning, setTransitioning] = useState<string | null>(null);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [incidentData, commentsData, historyData] = await Promise.all([
          fetchIncident(id),
          fetchIncidentComments(id),
          fetchIncidentHistory(id),
        ]);
        setIncident(incidentData);
        setComments(commentsData);
        setHistory(historyData);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleTransition(status: string) {
    setTransitioning(status);
    try {
      const updated = await updateIncidentStatus(id, status);
      setIncident(updated);
      // Refresh history
      const historyData = await fetchIncidentHistory(id);
      setHistory(historyData);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setTransitioning(null);
    }
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await addIncidentComment(id, commentText);
      setCommentText("");
      const commentsData = await fetchIncidentComments(id);
      setComments(commentsData);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssign() {
    if (!assignUserId) return;
    try {
      await assignIncident(id, assignUserId);
      setShowAssignModal(false);
      setAssignUserId("");
      // Refresh incident
      const incidentData = await fetchIncident(id);
      setIncident(incidentData);
      const historyData = await fetchIncidentHistory(id);
      setHistory(historyData);
    } catch (e: any) {
      alert(e.message);
    }
  }

  function openAssignModal() {
    fetchUsers({ limit: 100 }).then((res) => setUsers(res.data)).catch(() => {});
    setShowAssignModal(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/incidents")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error || "Incident non trouvé"}
        </div>
      </div>
    );
  }

  const slaStatus = getSlaStatus(incident);
  const transitions = getValidTransitions(incident.status, t);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/incidents")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{incident.title}</h1>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${severityColors[incident.severity]}`}>
                {t(`incidents.severities.${incident.severity}`)}
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[incident.status]}`}>
                {t(`incidents.statuses.${incident.status}`)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              ID: {incident.id.substring(0, 8)}... | Créé le {new Date(incident.createdAt).toLocaleDateString("fr")}
              {incident.sourceType === "alert" && " | Auto-généré depuis une alerte"}
            </p>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      {history && history.statusChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("incidents.timeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.statusChanges.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${statusColors[entry.status]?.split(" ")[0] || "bg-gray-400"}`} />
                    {idx < history.statusChanges.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t(`incidents.statuses.${entry.status}`) || entry.status}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.time).toLocaleString("fr")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.triggered_by === "auto-triage" ? "Généré automatiquement depuis une alerte" :
                       entry.triggered_by === "escalation" ? "Escalade SLA" :
                       entry.triggered_by === "system" ? "Système" :
                       `par ${entry.triggered_by || "système"}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("incidents.description")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {incident.description || "Aucune description"}
              </p>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Site:</span>
                  <p className="font-medium">{incident.siteId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Source:</span>
                  <p className="font-medium">
                    {incident.sourceType === "alert" ? "Alerte automatique" : "Manuel"}
                  </p>
                </div>
                {incident.sourceType === "alert" && incident.sourceId && (
                  <div>
                    <span className="text-muted-foreground">Alerte source:</span>
                    <p className="font-medium">{incident.sourceId}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Dernière mise à jour:</span>
                  <p className="font-medium">{new Date(incident.updatedAt).toLocaleString("fr")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t("incidents.comments")} ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("incidents.noComments")}</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {comment.user ? `${comment.user.firstName[0]}${comment.user.lastName[0]}` : "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.user ? `${comment.user.firstName} ${comment.user.lastName}` : "Utilisateur"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString("fr")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}

              <Separator />
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={t("incidents.addComment")}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                />
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions Card */}
          {transitions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {transitions.map((tran) => (
                  <Button
                    key={tran.status}
                    className="w-full"
                    variant={tran.variant}
                    onClick={() => handleTransition(tran.status)}
                    disabled={transitioning === tran.status}
                  >
                    {transitioning === tran.status ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <tran.icon className="mr-2 h-4 w-4" />
                    )}
                    {tran.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Assignment Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("incidents.assignedTo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {incident.assignedTo
                      ? `${incident.assignedTo.firstName[0]}${incident.assignedTo.lastName[0]}`
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {incident.assignedTo
                      ? `${incident.assignedTo.firstName} ${incident.assignedTo.lastName}`
                      : t("incidents.unassigned")}
                  </p>
                  {incident.assignedTo && (
                    <p className="text-xs text-muted-foreground">{incident.assignedTo.email}</p>
                  )}
                </div>
              </div>
              <Button size="sm" className="w-full" variant="outline" onClick={openAssignModal}>
                <UserCheck className="mr-2 h-4 w-4" />
                {t("incidents.assign")}
              </Button>

              {/* SLA Status */}
              {slaStatus.label && (
                <div className={`flex items-center gap-2 text-sm ${slaStatus.color}`}>
                  <Clock className="h-4 w-4" />
                  <span>{slaStatus.label} ({incident.slaMinutes}min)</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment History */}
          {history && history.assignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("incidents.history")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {history.assignments.map((a) => (
                  <div key={a.id} className="text-sm">
                    <p>
                      <span className="font-medium">
                        {a.assignedBy ? `${a.assignedBy.firstName} ${a.assignedBy.lastName}` : "?"}
                      </span>
                      {" → "}
                      <span className="font-medium">
                        {a.assignedTo ? `${a.assignedTo.firstName} ${a.assignedTo.lastName}` : "?"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.assignedAt).toLocaleString("fr")}
                    </p>
                    {a.note && <p className="text-xs text-muted-foreground mt-1">{a.note}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-background p-6 w-96 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">{t("incidents.assign")}</h3>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-4"
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
            >
              <option value="">Sélectionner un utilisateur...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.email})
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                Annuler
              </Button>
              <Button onClick={handleAssign} disabled={!assignUserId}>
                {t("incidents.assign")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
