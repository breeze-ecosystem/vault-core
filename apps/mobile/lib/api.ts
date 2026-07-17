import { fetchWithAuth } from "@/lib/auth-client";
import { API_URL as API_BASE } from "@/lib/config";

export interface DashboardStats {
  cameras: {
    total: number;
    online: number;
    offline: number;
    maintenance: number;
    degraded: number;
  };
  alerts: {
    total: number;
    open: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  organizations: { total: number; active: number };
  users: { total: number };
  recentAlerts: AlertItem[];
}

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "FALSE_POSITIVE";
export type CameraStatus = "ONLINE" | "OFFLINE" | "MAINTENANCE" | "DEGRADED";
export type NotificationChannel = "EMAIL" | "WEBHOOK" | "IN_APP";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED";

export interface AlertItem {
  id: string;
  title: string;
  description: string | null;
  severity: AlertSeverity;
  status: AlertStatus;
  cameraId: string;
  createdAt: string;
  camera?: { id: string; name: string };
}

export interface AlertDetail extends AlertItem {
  snapshotUrl: string | null;
  metadata: Record<string, unknown> | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  updatedAt: string;
}

export interface CameraItem {
  id: string;
  name: string;
  status: CameraStatus;
  organizationId: string;
  resolution: string | null;
  fps: number;
  isRecording: boolean;
  rtspUrl?: string;
  organization?: { id: string; name: string };
}

export interface OrganizationItem {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string;
  isActive: boolean;
  cameras?: CameraItem[];
  _count?: { cameras: number };
}

export interface ChatMessageDto {
  message: string;
  cameraId?: string;
  history?: string[];
}

export interface ChatResponse {
  answer: string;
  camerasQueried: string[];
  snapshotIncluded: boolean;
  timestamp: string;
}

export interface ChatCamera {
  id: string;
  name: string;
  status: CameraStatus;
  siteName?: string;
}

export interface NotificationSetting {
  id: string;
  userId: string;
  channel: NotificationChannel;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  alertId: string;
  channel: NotificationChannel;
  recipient: string;
  status: NotificationStatus;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
  alert: { id: string; title: string; severity: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetchWithAuth(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error("Impossible de charger les statistiques");
  return res.json();
}

export async function fetchAlerts(params?: {
  limit?: number;
  page?: number;
  severity?: AlertSeverity;
  status?: AlertStatus;
  cameraId?: string;
}): Promise<PaginatedResponse<AlertItem>> {
  const search = new URLSearchParams();
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.page) search.set("page", String(params.page));
  if (params?.severity) search.set("severity", params.severity);
  if (params?.status) search.set("status", params.status);
  if (params?.cameraId) search.set("cameraId", params.cameraId);
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/alerts${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Impossible de charger les alertes");
  return res.json();
}

export async function fetchAlertById(id: string): Promise<AlertDetail> {
  const res = await fetchWithAuth(`${API_BASE}/alerts/${id}`);
  if (!res.ok) throw new Error("Impossible de charger les details de l'alerte");
  return res.json();
}

export async function fetchCameras(params?: {
  organizationId?: string;
  status?: CameraStatus;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<CameraItem>> {
  const search = new URLSearchParams();
  if (params?.organizationId) search.set("organizationId", params.organizationId);
  if (params?.status) search.set("status", params.status);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/cameras${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Impossible de charger les cameras");
  return res.json();
}

export async function fetchCameraById(id: string): Promise<CameraItem> {
  const res = await fetchWithAuth(`${API_BASE}/cameras/${id}`);
  if (!res.ok) throw new Error("Impossible de charger la camera");
  return res.json();
}

export async function fetchCameraAlerts(cameraId: string, params?: {
  limit?: number;
  page?: number;
}): Promise<PaginatedResponse<AlertItem>> {
  return fetchAlerts({ cameraId, ...params });
}

export async function fetchOrganizations(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<OrganizationItem>> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit ?? 100));
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/organizations${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Impossible de charger les organisations");
  return res.json();
}

export async function fetchOrganization(orgId: string): Promise<OrganizationItem> {
  const res = await fetchWithAuth(`${API_BASE}/organizations/${orgId}`);
  if (!res.ok) throw new Error("Impossible de charger l'organisation");
  return res.json();
}

export async function createOrganization(data: {
  name: string;
  address?: string;
  city?: string;
  country?: string;
}): Promise<OrganizationItem> {
  const res = await fetchWithAuth(`${API_BASE}/organizations`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Impossible de creer l'organisation");
  }
  return res.json();
}

export async function acknowledgeAlert(id: string): Promise<AlertDetail> {
  const res = await fetchWithAuth(`${API_BASE}/alerts/${id}/acknowledge`, { method: "PATCH" });
  if (!res.ok) throw new Error("Impossible de prendre en compte l'alerte");
  return res.json();
}

export async function resolveAlert(id: string): Promise<AlertDetail> {
  const res = await fetchWithAuth(`${API_BASE}/alerts/${id}/resolve`, { method: "PATCH" });
  if (!res.ok) throw new Error("Impossible de resoudre l'alerte");
  return res.json();
}

export async function markAlertFalsePositive(id: string): Promise<AlertDetail> {
  const res = await fetchWithAuth(`${API_BASE}/alerts/${id}/false-positive`, { method: "PATCH" });
  if (!res.ok) throw new Error("Impossible de marquer comme faux positif");
  return res.json();
}

export async function deleteAlert(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/alerts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Impossible de supprimer l'alerte");
}

export async function sendChatMessage(dto: ChatMessageDto): Promise<ChatResponse> {
  const res = await fetchWithAuth(`${API_BASE}/chat`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Impossible d'envoyer le message");
  return res.json();
}

export async function fetchChatCameras(): Promise<ChatCamera[]> {
  const res = await fetchWithAuth(`${API_BASE}/chat/cameras`);
  if (!res.ok) throw new Error("Impossible de charger les cameras");
  return res.json();
}

export async function getNotificationSettings(): Promise<NotificationSetting[]> {
  const res = await fetchWithAuth(`${API_BASE}/notifications/settings`);
  if (!res.ok) throw new Error("Impossible de charger les parametres");
  return res.json();
}

export async function updateNotificationSettings(
  settings: { channel: NotificationChannel; enabled: boolean; config?: Record<string, unknown> }[]
): Promise<NotificationSetting[]> {
  const res = await fetchWithAuth(`${API_BASE}/notifications/settings`, {
    method: "PUT",
    body: JSON.stringify({ settings }),
  });
  if (!res.ok) throw new Error("Impossible de sauvegarder les parametres");
  return res.json();
}

export async function getNotificationLogs(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<NotificationLog>> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit ?? 20));
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/notifications/logs${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Impossible de charger l'historique");
  return res.json();
}

export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  const res = await fetchWithAuth(`${API_BASE}/notifications/test`, { method: "POST" });
  if (!res.ok) throw new Error("Impossible d'envoyer la notification test");
  return res.json();
}

export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<{ accessToken: string; user: { id: string; email: string; firstName: string; lastName: string; role: string } }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Echec de l'inscription");
  return body;
}

export async function updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/users/${userId}/change-password`, {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Impossible de changer le mot de passe");
  }
}

export async function startCameraIngestion(cameraId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/ingestion/${cameraId}/start`, { method: "POST" });
  if (!res.ok) throw new Error("Impossible de demarrer l'ingestion");
}

export async function stopCameraIngestion(cameraId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/ingestion/${cameraId}/stop`, { method: "POST" });
  if (!res.ok) throw new Error("Impossible d'arreter l'ingestion");
}

export async function captureSnapshot(cameraId: string): Promise<{ image: string }> {
  const res = await fetchWithAuth(`${API_BASE}/ingestion/${cameraId}/snapshot`);
  if (!res.ok) throw new Error("Impossible de capturer l'image");
  return res.json();
}

// ─── Phase 8: Incident Response ───

export interface MobileIncidentDto {
  id: string;
  title: string;
  severity: string;
  status: string;
  zoneName?: string;
  createdAt: string;
  slaMinutes: number;
  assignedToId?: string;
}

export async function fetchMyIncidents(): Promise<MobileIncidentDto[]> {
  const res = await fetchWithAuth(`${API_BASE}/incidents?assignedToMe=true`);
  if (!res.ok) throw new Error("Impossible de charger les incidents");
  const data = await res.json();
  return data.data || data;
}

export async function fetchMobileIncident(id: string): Promise<MobileIncidentDto> {
  const res = await fetchWithAuth(`${API_BASE}/incidents/${id}`);
  if (!res.ok) throw new Error("Impossible de charger l'incident");
  return res.json();
}

export async function updateMobileIncidentStatus(id: string, status: string, reason?: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/incidents/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Impossible de mettre à jour le statut");
  }
}

// ─── Phase 9: AI Agent Chat ───

export interface MobileAgentChatResponse {
  response: string;
  sessionId: string;
}

export interface MobileAgentStatus {
  ollamaAvailable: boolean;
  agentsCount: number;
}

/** Synchrone — POST /api/ai/agent-chat (pas de streaming) */
export async function agentChat(message: string): Promise<MobileAgentChatResponse> {
  const res = await fetchWithAuth(`${API_BASE}/ai/agent-chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Échec de la communication avec l'assistant IA");
  }
  return res.json();
}

/** SSE streaming pour React Native — utilise fetch() avec streaming ReadableStream */
export function createAgentChatSSE(
  message: string,
  sessionId: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const url = `${API_BASE}/ai-agent/chat`;
      const { getAccessTokenAsync } = await import("@/lib/auth-storage");
      const token = await getAccessTokenAsync();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ message, sessionId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Échec de la communication avec l'assistant IA");
      }

      if (!res.body) {
        throw new Error("Pas de réponse du serveur");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              onDone();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                onToken(parsed.token);
              }
            } catch {
              // Ligne non-JSON — ignorer
            }
          } else if (line.startsWith("event: done") || line.trim() === "") {
            // Lignes de contrôle SSE — continuer
          }
        }
      }

      onDone();
    } catch (err: any) {
      if (err.name === "AbortError") return;
      onError(err instanceof Error ? err : new Error("Erreur de connexion SSE"));
    }
  })();

  return controller;
}

/** Vérifie la disponibilité du service IA */
export async function getAgentStatus(): Promise<MobileAgentStatus> {
  const res = await fetchWithAuth(`${API_BASE}/ai-agent/status`);
  if (!res.ok) {
    throw new Error("Service IA indisponible");
  }
  return res.json();
}

// ─── Phase 10: Guard Mobile Workflows ───

export interface BadgeValidationResult {
  valid: boolean;
  userName?: string;
  accessLevel?: string;
  reason?: string;
}

export interface CheckInResult {
  success: boolean;
  visitorName?: string;
  hostName?: string;
  checkInTime?: string;
  accessLevel?: string;
  alreadyCheckedIn?: boolean;
}

export interface DoorControlResult {
  success: boolean;
  newState?: string;
  message?: string;
}

/** Valide un badge NFC via l'API */
export async function validateBadge(badgeId: string): Promise<BadgeValidationResult> {
  const res = await fetchWithAuth(`${API_BASE}/access/validate-credential`, {
    method: "POST",
    body: JSON.stringify({ badgeId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Badge invalide");
  }
  return res.json();
}

/** Check-in d'un visiteur via QR code */
export async function checkInVisitor(token: string): Promise<CheckInResult> {
  const res = await fetchWithAuth(`${API_BASE}/visitors/check-in`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Check-in impossible");
  }
  return res.json();
}

/** Contrôle à distance d'une porte */
export async function controlDoor(doorId: string, action: string): Promise<DoorControlResult> {
  const res = await fetchWithAuth(`${API_BASE}/doors/${doorId}/control`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Action impossible");
  }
  return res.json();
}

/** Téléverse une photo comme preuve d'incident */
export async function uploadIncidentPhoto(incidentId: string, photoUri: string): Promise<{ id: string; url: string }> {
  const formData = new FormData();
  const filename = photoUri.split("/").pop() || "photo.jpg";
  const fileType = filename.endsWith(".png") ? "image/png" : "image/jpeg";

  formData.append("file", {
    uri: photoUri,
    name: filename,
    type: fileType,
  } as any);

  const res = await fetchWithAuth(`${API_BASE}/incidents/${incidentId}/evidence`, {
    method: "POST",
    body: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Impossible de téléverser la photo");
  }
  return res.json();
}

// ─── Phase 06: Feature Parity — API Client Functions ───

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  userName: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  timestamp: string;
}

export async function fetchAuditLogs(params?: {
  entity?: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<AuditLogEntry>> {
  const search = new URLSearchParams();
  if (params?.entity) search.set("entity", params.entity);
  if (params?.action) search.set("action", params.action);
  if (params?.userId) search.set("userId", params.userId);
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/audit/logs${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des journaux d'audit");
  return res.json();
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  status: "active" | "revoked";
  lastUsed: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export async function fetchApiKeys(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<ApiKey>> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/api-keys${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des clés API");
  return res.json();
}

export async function createApiKey(data: { name: string; scopes?: string[] }): Promise<ApiKey> {
  const res = await fetchWithAuth(`${API_BASE}/api-keys`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Erreur lors de la création de la clé API");
  }
  return res.json();
}

export async function revokeApiKey(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api-keys/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur lors de la révocation de la clé API");
}

export interface ComplianceReport {
  id: string;
  title: string;
  status: "compliant" | "non_compliant" | "pending";
  generatedAt: string;
  period: string;
  metrics: Record<string, number>;
}

export async function fetchComplianceReports(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<ComplianceReport>> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/compliance/reports${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des rapports de conformité");
  return res.json();
}

export interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: "active" | "disabled";
  lastDelivery: string | null;
  createdAt: string;
}

export async function fetchWebhooks(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<WebhookSubscription>> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/webhooks/subscriptions${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des webhooks");
  return res.json();
}

export async function createWebhook(data: { name: string; url: string; events: string[] }): Promise<WebhookSubscription> {
  const res = await fetchWithAuth(`${API_BASE}/webhooks/subscriptions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Erreur lors de la création du webhook");
  }
  return res.json();
}

export async function updateWebhook(id: string, data: { name?: string; url?: string; events?: string[]; status?: string }): Promise<WebhookSubscription> {
  const res = await fetchWithAuth(`${API_BASE}/webhooks/subscriptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Erreur lors de la mise à jour du webhook");
  }
  return res.json();
}

export async function deleteWebhook(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/webhooks/subscriptions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur lors de la suppression du webhook");
}

export async function testWebhook(id: string): Promise<{ success: boolean; statusCode: number }> {
  const res = await fetchWithAuth(`${API_BASE}/webhooks/subscriptions/${id}/test`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Erreur lors du test du webhook");
  }
  return res.json();
}

export interface SchemaDefinition {
  id: string;
  name: string;
  version: string;
  schema: Record<string, unknown>;
  isActive: boolean;
}

export async function fetchSchemas(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<SchemaDefinition>> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/schemas${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des schémas");
  return res.json();
}

export interface EquipmentItem {
  id: string;
  name: string;
  type: string;
  status: "ONLINE" | "OFFLINE" | "DEGRADED";
  siteId: string;
  siteName: string | null;
  lastHeartbeat: string | null;
  metrics: Record<string, unknown>;
}

export async function fetchEquipment(params?: {
  siteId?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<EquipmentItem>> {
  const search = new URLSearchParams();
  if (params?.siteId) search.set("siteId", params.siteId);
  if (params?.type) search.set("type", params.type);
  if (params?.status) search.set("status", params.status);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/equipment${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des équipements");
  return res.json();
}

export interface MaintenanceTicket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export async function fetchMaintenanceTickets(params?: {
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<MaintenanceTicket>> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.priority) search.set("priority", params.priority);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/maintenance/tickets${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des tickets de maintenance");
  return res.json();
}

export async function createMaintenanceTicket(data: { title: string; description?: string; priority?: string }): Promise<MaintenanceTicket> {
  const res = await fetchWithAuth(`${API_BASE}/maintenance/tickets`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Erreur lors de la création du ticket de maintenance");
  }
  return res.json();
}

export interface SecurityPattern {
  id: string;
  name: string;
  description: string | null;
  type: string;
  severity: string;
  detectedAt: string;
  status: "active" | "resolved";
}

export async function fetchPatterns(params?: {
  deviceType?: string;
  severity?: string;
  resolved?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<SecurityPattern>> {
  const search = new URLSearchParams();
  if (params?.deviceType) search.set("deviceType", params.deviceType);
  if (params?.severity) search.set("severity", params.severity);
  if (params?.resolved) search.set("resolved", params.resolved);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/patterns${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des schémas de sécurité");
  return res.json();
}
