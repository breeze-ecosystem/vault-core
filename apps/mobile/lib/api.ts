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
  sites: { total: number; active: number };
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
  siteId: string;
  resolution: string | null;
  fps: number;
  isRecording: boolean;
  rtspUrl?: string;
  site?: { id: string; name: string };
}

export interface SiteItem {
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
  siteId?: string;
  status?: CameraStatus;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<CameraItem>> {
  const search = new URLSearchParams();
  if (params?.siteId) search.set("siteId", params.siteId);
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

export async function fetchSites(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<SiteItem>> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit ?? 100));
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/sites${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Impossible de charger les sites");
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
