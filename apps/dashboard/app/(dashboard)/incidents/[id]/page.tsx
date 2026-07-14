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
  fetchIncidentEvidence,
  addIncidentEvidence,
  removeIncidentEvidence,
  downloadIncidentReport,
  type IncidentDto,
  type IncidentCommentDto,
  type IncidentHistoryDto,
  type IncidentEvidenceDto,
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
  Paperclip,
  Plus,
  Trash2,
  Download,
  Video,
  Camera,
  FileText,
  Key,
  File,
  X,
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

  // Evidence state
  const [evidenceList, setEvidenceList] = useState<IncidentEvidenceDto[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState<{
    type: "video_clip" | "snapshot" | "access_event" | "document" | "note";
    url: string;
    eventType: string;
    eventId: string;
    description: string;
  }>({ type: "snapshot", url: "", eventType: "", eventId: "", description: "" });
  const [addingEvidence, setAddingEvidence] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [incidentData, commentsData, historyData, evidenceData] = await Promise.all([
          fetchIncident(id),
          fetchIncidentComments(id),
          fetchIncidentHistory(id),
          fetchIncidentEvidence(id),
        ]);
        setIncident(incidentData);
        setComments(commentsData);
        setHistory(historyData);
        setEvidenceList(evidenceData);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
        setEvidenceLoading(false);
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

  // ── Evidence Handlers ──

  async function handleAddEvidence() {
    setAddingEvidence(true);
    try {
      const newEvidence = await addIncidentEvidence(id, evidenceForm);
      setEvidenceList((prev) => [newEvidence, ...prev]);
      setShowEvidenceModal(false);
      setEvidenceForm({ type: "snapshot", url: "", eventType: "", eventId: "", description: "" });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAddingEvidence(false);
    }
  }

  async function handleRemoveEvidence(evidenceId: string) {
    try {
      await removeIncidentEvidence(id, evidenceId);
      setEvidenceList((prev) => prev.filter((e) => e.id !== evidenceId));
      setShowDeleteConfirm(null);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDownloadReport() {
    setDownloadingReport(true);
    try {
      await downloadIncidentReport(id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDownloadingReport(false);
    }
  }

  const evidenceTypeIcons: Record<string, any> = {
    video_clip: Video,
    snapshot: Camera,
    access_event: Key,
    document: FileText,
    note: File,
  };

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

          {/* Evidence Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                {t("incidents.evidence.title")} ({evidenceList.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {evidenceLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : evidenceList.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("incidents.evidence.noEvidence")}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {evidenceList.map((ev) => {
                    const Icon = evidenceTypeIcons[ev.type] || File;
                    return (
                      <div key={ev.id} className="rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium uppercase text-muted-foreground">
                              {t(`incidents.evidence.types.${ev.type}`)}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setShowDeleteConfirm(ev.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {ev.description && (
                          <p className="text-sm mt-1">{ev.description}</p>
                        )}
                        {ev.url && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {ev.type === "snapshot" || ev.type === "video_clip" ? (
                              <a href={ev.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                                {ev.url}
                              </a>
                            ) : (
                              ev.url
                            )}
                          </p>
                        )}
                        {ev.eventId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("incidents.evidence.eventId")}: {ev.eventId}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{ev.uploaderName || t("incidents.evidence.uploader")}</span>
                          <span>•</span>
                          <span>{new Date(ev.createdAt).toLocaleString("fr")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Separator />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowEvidenceModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("incidents.evidence.add")}
              </Button>
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

          {/* Closure Report */}
          {(incident.status === "resolved" || incident.status === "closed") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("incidents.report.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="default"
                  onClick={handleDownloadReport}
                  disabled={downloadingReport}
                >
                  {downloadingReport ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {downloadingReport ? t("incidents.report.generating") : t("incidents.report.download")}
                </Button>
              </CardContent>
            </Card>
          )}

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

      {/* Evidence Modal */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-background p-6 w-96 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t("incidents.evidence.add")}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowEvidenceModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">{t("incidents.evidence.type")}</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={evidenceForm.type}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, type: e.target.value as any })}
                >
                  <option value="video_clip">{t("incidents.evidence.types.video_clip")}</option>
                  <option value="snapshot">{t("incidents.evidence.types.snapshot")}</option>
                  <option value="access_event">{t("incidents.evidence.types.access_event")}</option>
                  <option value="document">{t("incidents.evidence.types.document")}</option>
                  <option value="note">{t("incidents.evidence.types.note")}</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{t("incidents.evidence.url")}</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={evidenceForm.url}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              {evidenceForm.type === "access_event" && (
                <div>
                  <label className="text-sm font-medium">{t("incidents.evidence.eventId")}</label>
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                    value={evidenceForm.eventId}
                    onChange={(e) => setEvidenceForm({ ...evidenceForm, eventId: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium">{t("incidents.evidence.description")}</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={evidenceForm.description}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })}
                  rows={2}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleAddEvidence}
                disabled={addingEvidence}
              >
                {addingEvidence ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Ajouter
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Evidence Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-background p-6 w-80 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">{t("incidents.evidence.deleteConfirm")}</h3>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRemoveEvidence(showDeleteConfirm)}
              >
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
