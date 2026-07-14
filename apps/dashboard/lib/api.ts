import { fetchWithAuth } from "@/lib/auth-client";

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.error("NEXT_PUBLIC_API_URL is not defined. Set it in .env or .env.local");
}
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// --- Types ---

export interface CameraPrompt {
  id: string;
  cameraId: string;
  text: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Camera {
  id: string;
  name: string;
  rtspUrl: string;
  status: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "DEGRADED";
  siteId: string;
  resolution: string | null;
  fps: number;
  captureInterval: number;
  isRecording: boolean;
  lastSnapshotUrl: string | null;
  lastHeartbeat: string | null;
  createdAt: string;
  updatedAt: string;
  site?: Site;
  prompts?: CameraPrompt[];
  _count?: { alerts: number };
}

export interface Alert {
  id: string;
  title: string;
  description: string | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "FALSE_POSITIVE";
  cameraId: string;
  snapshotUrl: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  camera?: Camera;
}

export interface Site {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  cameras?: Camera[];
  _count?: { cameras: number; users: number };
}

export interface DashboardUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  siteId: string | null;
  createdAt: string;
}

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
  sites: {
    total: number;
    active: number;
  };
  users: {
    total: number;
  };
  recentAlerts: Alert[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// --- API functions ---

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetchWithAuth(`${API_URL}/api/dashboard/stats`);
  if (!res.ok) throw new Error("Failed to fetch dashboard stats");
  return res.json();
}

export async function fetchCameras(params?: {
  page?: number;
  limit?: number;
  status?: string;
  siteId?: string;
}): Promise<PaginatedResponse<Camera>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.status) searchParams.set("status", params.status);
  if (params?.siteId) searchParams.set("siteId", params.siteId);

  const res = await fetchWithAuth(`${API_URL}/api/cameras?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch cameras");
  return res.json();
}

export async function fetchAlerts(params?: {
  page?: number;
  limit?: number;
  severity?: string;
  status?: string;
  cameraId?: string;
}): Promise<PaginatedResponse<Alert>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.severity) searchParams.set("severity", params.severity);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.cameraId) searchParams.set("cameraId", params.cameraId);

  const res = await fetchWithAuth(`${API_URL}/api/alerts?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function fetchSites(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Site>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const res = await fetchWithAuth(`${API_URL}/api/sites?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch sites");
  return res.json();
}

export async function fetchUsers(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<DashboardUser>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const res = await fetchWithAuth(`${API_URL}/api/users?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

// --- Alert actions ---

export async function acknowledgeAlert(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/${id}/acknowledge`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to acknowledge alert");
}

export async function resolveAlert(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/${id}/resolve`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to resolve alert");
}

export async function markAlertFalsePositive(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/${id}/false-positive`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to mark as false positive");
}

export async function deleteAlert(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Échec de la suppression de l'alerte");
}

// --- Site actions ---

export async function createSite(data: { name: string; address?: string; city?: string; country?: string }): Promise<Site> {
  const res = await fetchWithAuth(`${API_URL}/api/sites`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create site");
  return res.json();
}

export async function updateSite(id: string, data: any): Promise<Site> {
  const res = await fetchWithAuth(`${API_URL}/api/sites/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update site");
  return res.json();
}

// --- Camera actions ---

export async function createCamera(data: { name: string; rtspUrl: string; siteId: string; resolution?: string; fps?: number; captureInterval?: number }): Promise<Camera> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create camera");
  return res.json();
}

export async function updateCamera(id: string, data: any): Promise<Camera> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update camera");
  return res.json();
}

// --- Camera stream actions ---

export async function startStream(cameraId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/ingestion/${cameraId}/start`, { method: "POST", body: JSON.stringify({}) });
  if (!res.ok) throw new Error("Failed to start stream");
}

export async function stopStream(cameraId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/ingestion/${cameraId}/stop`, { method: "POST", body: JSON.stringify({}) });
  if (!res.ok) throw new Error("Failed to stop stream");
}

export async function fetchActiveStreams(): Promise<string[]> {
  const res = await fetchWithAuth(`${API_URL}/api/ingestion/active`);
  if (!res.ok) throw new Error("Failed to fetch active streams");
  const data = await res.json();
  return data.cameras;
}

// --- Camera prompt actions ---

export async function fetchCameraPrompts(cameraId: string): Promise<CameraPrompt[]> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/prompts`);
  if (!res.ok) throw new Error("Failed to fetch prompts");
  return res.json();
}

export async function addCameraPrompt(cameraId: string, data: { text: string; severity?: string }): Promise<CameraPrompt> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/prompts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add prompt");
  return res.json();
}

export async function updateCameraPrompt(cameraId: string, promptId: string, data: { text?: string; severity?: string; isActive?: boolean }): Promise<CameraPrompt> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/prompts/${promptId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update prompt");
  return res.json();
}

export async function deleteCameraPrompt(cameraId: string, promptId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/prompts/${promptId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete prompt");
}

// --- User actions ---

export async function createUser(data: { email: string; password: string; firstName: string; lastName: string; role: string; siteId?: string }): Promise<DashboardUser> {
  const res = await fetchWithAuth(`${API_URL}/api/users`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Échec de création de l'utilisateur");
  }
  return res.json();
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/users/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Échec de suppression de l'utilisateur");
  }
}

export async function deleteCamera(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Échec de suppression de la caméra");
  }
}

export async function deleteSite(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/sites/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete site");
}

export async function fetchCameraSnapshot(cameraId: string): Promise<string | null> {
  const res = await fetchWithAuth(`${API_URL}/api/ingestion/${cameraId}/snapshot`);
  if (!res.ok) throw new Error("Failed to fetch snapshot");
  const data = await res.json();
  return data.snapshot;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/users/${userId}/change-password`, {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Échec du changement de mot de passe");
  }
}

export async function updateUser(id: string, data: { firstName?: string; lastName?: string; role?: string; isActive?: boolean }): Promise<DashboardUser> {
  const res = await fetchWithAuth(`${API_URL}/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update user");
  return res.json();
}

// --- Notifications ---

export interface NotificationSetting {
  id: string;
  userId: string;
  channel: "EMAIL" | "WEBHOOK" | "IN_APP";
  enabled: boolean;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  alertId: string;
  channel: "EMAIL" | "WEBHOOK" | "IN_APP";
  recipient: string;
  status: "PENDING" | "SENT" | "FAILED";
  sentAt: string | null;
  error: string | null;
  createdAt: string;
  alert: { id: string; title: string; severity: string };
}

export async function getNotificationSettings(): Promise<NotificationSetting[]> {
  const res = await fetchWithAuth(`${API_URL}/api/notifications/settings`);
  if (!res.ok) throw new Error("Failed to fetch notification settings");
  return res.json();
}

export async function updateNotificationSettings(
  settings: { channel: "EMAIL" | "WEBHOOK" | "IN_APP"; enabled: boolean; config?: Record<string, any> }[]
): Promise<NotificationSetting[]> {
  const res = await fetchWithAuth(`${API_URL}/api/notifications/settings`, {
    method: "PUT",
    body: JSON.stringify({ settings }),
  });
  if (!res.ok) throw new Error("Failed to update notification settings");
  return res.json();
}

export async function getNotificationLogs(params?: {
  page?: number;
  limit?: number;
  channel?: string;
  status?: string;
}): Promise<{ data: NotificationLog[]; total: number; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.channel) searchParams.set("channel", params.channel);
  if (params?.status) searchParams.set("status", params.status);

  const res = await fetchWithAuth(`${API_URL}/api/notifications/logs?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch notification logs");
  return res.json();
}

export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/notifications/test`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Échec de l'envoi de la notification test");
  }
  return res.json();
}

// --- Chat functions ---

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
  status: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "DEGRADED";
  siteName?: string;
}

export async function fetchChatCameras(): Promise<ChatCamera[]> {
  const res = await fetchWithAuth(`${API_URL}/api/chat/cameras`);
  if (!res.ok) throw new Error("Failed to fetch chat cameras");
  return res.json();
}

export async function sendChatMessage(dto: ChatMessageDto): Promise<ChatResponse> {
  const res = await fetchWithAuth(`${API_URL}/api/chat`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to send chat message");
  }
  return res.json();
}

// ─── Access Control Types ───

export interface CredentialDto {
  id: string;
  userId: string;
  type: "BADGE" | "PIN" | "MOBILE" | "QR";
  badgeNumber?: string | null;
  pinHash?: string | null;
  mobileWalletId?: string | null;
  qrSeed?: string | null;
  isActive: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  maxUses?: number | null;
  useCount: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  accessLevels?: AccessLevelDto[];
}

export interface AccessLevelDto {
  id: string;
  credentialId: string;
  zoneId: string;
  scheduleId: string;
  priority: number;
  zone?: ZoneDto;
  schedule?: ScheduleDto;
}

export interface ScheduleDto {
  id: string;
  name: string;
  zoneId: string;
  entries: ScheduleEntry[];
  holidayOverride?: string | null;
}

export interface ScheduleEntry {
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface ZoneDto {
  id: string;
  name: string;
  siteId: string;
  description?: string | null;
}

export interface DoorDto {
  id: string;
  name: string;
  siteId: string;
  zoneId: string;
  controllerId?: string | null;
  alertConfig: Record<string, unknown>;
}

// ─── Access Control API Functions ───

export async function fetchCredentials(params?: {
  type?: string;
  userId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ data: CredentialDto[]; total: number; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set("type", params.type);
  if (params?.userId) searchParams.set("userId", params.userId);
  if (params?.isActive !== undefined) searchParams.set("isActive", String(params.isActive));
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const res = await fetchWithAuth(`${API_URL}/api/access/credentials?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des justificatifs d'accès");
  return res.json();
}

export async function fetchCredential(id: string): Promise<CredentialDto> {
  const res = await fetchWithAuth(`${API_URL}/api/access/credentials/${id}`);
  if (!res.ok) throw new Error("Échec du chargement du justificatif");
  return res.json();
}

export async function createCredential(data: {
  userId: string;
  type: string;
  badgeNumber?: string;
  pinHash?: string;
  qrSeed?: string;
  validFrom?: string;
  validUntil?: string;
  maxUses?: number;
}): Promise<CredentialDto> {
  const res = await fetchWithAuth(`${API_URL}/api/access/credentials`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de création du justificatif");
  }
  return res.json();
}

export async function updateCredential(
  id: string,
  data: Record<string, unknown>,
): Promise<CredentialDto> {
  const res = await fetchWithAuth(`${API_URL}/api/access/credentials/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour du justificatif");
  return res.json();
}

export async function deactivateCredential(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/access/credentials/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Échec de la désactivation du justificatif");
}

export async function generateCredentialQr(id: string): Promise<{ qrDataUrl: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/access/credentials/${id}/qr`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Échec de la génération du QR code");
  return res.json();
}

export async function fetchAccessLevels(credentialId: string): Promise<AccessLevelDto[]> {
  const res = await fetchWithAuth(
    `${API_URL}/api/access/levels?credentialId=${credentialId}`,
  );
  if (!res.ok) throw new Error("Échec du chargement des niveaux d'accès");
  return res.json();
}

export async function createAccessLevel(data: {
  credentialId: string;
  zoneId: string;
  scheduleId: string;
  priority?: number;
}): Promise<AccessLevelDto> {
  const res = await fetchWithAuth(`${API_URL}/api/access/levels`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de création du niveau d'accès");
  }
  return res.json();
}

export async function deleteAccessLevel(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/access/levels/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Échec de suppression du niveau d'accès");
}

export async function fetchZones(): Promise<ZoneDto[]> {
  const res = await fetchWithAuth(`${API_URL}/api/access/zones`);
  if (!res.ok) throw new Error("Échec du chargement des zones");
  return res.json();
}

export async function fetchSchedules(): Promise<ScheduleDto[]> {
  const res = await fetchWithAuth(`${API_URL}/api/access/schedules`);
  if (!res.ok) throw new Error("Échec du chargement des plannings");
  return res.json();
}

export async function fetchDoors(): Promise<DoorDto[]> {
  const res = await fetchWithAuth(`${API_URL}/api/access/doors`);
  if (!res.ok) throw new Error("Échec du chargement des portes");
  return res.json();
}

// ─── Door Monitoring Types ───

export interface DoorStateDto {
  doorId: string;
  name: string;
  zoneId: string;
  zoneName?: string;
  state: "locked" | "unlocked" | "held-open" | "forced" | "unsecured" | "desynchronized";
  lastChanged: string;
  controllerId?: string;
}

export interface DoorAlertConfigDto {
  heldOpenThresholdMs: number;
}

// ─── Door State API Functions ───

export async function fetchAllDoorStates(siteId?: string): Promise<DoorStateDto[]> {
  const res = await fetchWithAuth(`${API_URL}/api/doors/states`);
  if (!res.ok) throw new Error("Échec du chargement de l'état des portes");
  return res.json();
}

export async function fetchDoorState(doorId: string): Promise<DoorStateDto> {
  const res = await fetchWithAuth(`${API_URL}/api/doors/${doorId}/state`);
  if (!res.ok) throw new Error("Échec du chargement de l'état de la porte");
  return res.json();
}

export async function fetchDoorStateHistory(
  doorId: string,
  from: string,
  to: string,
): Promise<{ time: string; state: string }[]> {
  const params = new URLSearchParams({ from, to });
  const res = await fetchWithAuth(`${API_URL}/api/doors/${doorId}/history?${params.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement de l'historique");
  return res.json();
}

// ─── Emergency Controls ───

export async function lockdownZone(zoneId: string, reason?: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/doors/zones/${zoneId}/lockdown`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Échec du verrouillage d'urgence");
}

export async function emergencyUnlockZone(zoneId: string, reason?: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/doors/zones/${zoneId}/emergency-unlock`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Échec du déverrouillage d'urgence");
}

export async function clearEmergencyOverride(zoneId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/doors/zones/${zoneId}/clear-emergency`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Échec de la restauration du mode normal");
}

// ─── Alert Config ───

export async function updateDoorAlertConfig(
  doorId: string,
  config: Partial<DoorAlertConfigDto>,
): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/doors/${doorId}/alert-config`, {
    method: "PATCH",
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Échec de la configuration d'alerte");
}

// ─── Timeline Types ───

export interface TimelineEntryDto {
  eventId: string;
  eventType: "access" | "door";
  timestamp: string;
  doorId: string;
  doorName?: string;
  zoneId?: string;
  summary: string;
  detail?: string;
  videoThumbnailUrl?: string;
  snapshotUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface TimelineSearchParams {
  siteId: string;
  from?: string;
  to?: string;
  credentialId?: string;
  userId?: string;
  doorId?: string;
  zoneId?: string;
  decision?: "granted" | "denied";
  page?: number;
  limit?: number;
}

// ─── Timeline API Functions ───

export async function fetchTimeline(
  siteId: string,
  params?: { from?: string; to?: string; limit?: number },
): Promise<{ data: TimelineEntryDto[] }> {
  const searchParams = new URLSearchParams();
  searchParams.set("siteId", siteId);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const res = await fetchWithAuth(`${API_URL}/api/timeline/events?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement de la chronologie");
  return res.json();
}

export async function searchTimeline(
  params: TimelineSearchParams,
): Promise<{ data: TimelineEntryDto[]; total: number; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set("siteId", params.siteId);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.credentialId) searchParams.set("credentialId", params.credentialId);
  if (params.userId) searchParams.set("userId", params.userId);
  if (params.doorId) searchParams.set("doorId", params.doorId);
  if (params.zoneId) searchParams.set("zoneId", params.zoneId);
  if (params.decision) searchParams.set("decision", params.decision);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const res = await fetchWithAuth(`${API_URL}/api/timeline/search?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec de la recherche dans la chronologie");
  return res.json();
}

export async function fetchEventVideo(
  eventId: string,
): Promise<{ cameraId: string; snapshotUrl?: string; thumbnailUrl?: string; timestamp: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/timeline/events/${eventId}/video`);
  if (!res.ok) throw new Error("Échec du chargement de la vidéo");
  return res.json();
}

// ─── Audit Types ───

export interface AuditEntryDto {
  time: string;
  entity: string;
  entityId: string;
  action: string;
  userId?: string;
  userName?: string;
  siteId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  hash: string;
  previousHash?: string;
}

export interface ChainVerificationResultDto {
  verified: boolean;
  totalEntries: number;
  tamperedIndices: number[];
  genesisHash: string | null;
  latestHash: string | null;
}

export interface AuditStatsDto {
  totalEntries: number;
  byEntity: Record<string, number>;
  byAction: Record<string, number>;
  byHour: { hour: string; count: number }[];
}

// ─── Audit API Functions ───

export async function fetchAuditLogs(params: {
  entity?: string;
  entityId?: string;
  userId?: string;
  siteId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: AuditEntryDto[]; total: number; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  if (params.entity) searchParams.set("entity", params.entity);
  if (params.entityId) searchParams.set("entityId", params.entityId);
  if (params.userId) searchParams.set("userId", params.userId);
  if (params.siteId) searchParams.set("siteId", params.siteId);
  if (params.action) searchParams.set("action", params.action);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const res = await fetchWithAuth(`${API_URL}/api/audit/logs?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des journaux d'audit");
  return res.json();
}

export async function verifyAuditChain(
  entity: string,
  entityId: string,
): Promise<ChainVerificationResultDto> {
  const params = new URLSearchParams({ entity, entityId });
  const res = await fetchWithAuth(
    `${API_URL}/api/audit/verify?${params.toString()}`,
  );
  if (!res.ok) throw new Error("Échec de la vérification de la chaîne de hachage");
  return res.json();
}

export async function exportAuditLog(params: {
  entity?: string;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
  format?: "json" | "csv";
}): Promise<Blob> {
  const searchParams = new URLSearchParams();
  if (params.entity) searchParams.set("entity", params.entity);
  if (params.userId) searchParams.set("userId", params.userId);
  if (params.action) searchParams.set("action", params.action);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.format) searchParams.set("format", params.format);

  const res = await fetchWithAuth(
    `${API_URL}/api/audit/export?${searchParams.toString()}`,
  );
  if (!res.ok) throw new Error("Échec de l'export des journaux d'audit");
  return res.blob();
}

export async function fetchAuditStats(): Promise<AuditStatsDto> {
  const res = await fetchWithAuth(`${API_URL}/api/audit/stats`);
  if (!res.ok) throw new Error("Échec du chargement des statistiques d'audit");
  return res.json();
}

// ─── Incident Types ───

export interface IncidentDto {
  id: string;
  title: string;
  description?: string | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  status: string;
  siteId: string;
  sourceType?: string | null;
  sourceId?: string | null;
  assignedToId?: string | null;
  assignedAt?: string | null;
  slaMinutes: number;
  escalationChain: any[];
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  _count?: { comments: number; evidence?: number };
}

export interface IncidentCommentDto {
  id: string;
  incidentId: string;
  userId: string;
  text: string;
  createdAt: string;
  user?: { firstName: string; lastName: string };
}

export interface IncidentHistoryDto {
  assignments: Array<{
    id: string;
    assignedById: string;
    assignedToId: string;
    assignedAt: string;
    note?: string | null;
    assignedBy?: { firstName: string; lastName: string };
    assignedTo?: { firstName: string; lastName: string };
  }>;
  statusChanges: Array<{
    time: string;
    status: string;
    previous_status?: string | null;
    triggered_by?: string | null;
    metadata?: any;
  }>;
}

// ─── Incident API Functions ───

export async function fetchIncidents(params?: {
  status?: string;
  severity?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: IncidentDto[]; total: number; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.severity) searchParams.set("severity", params.severity);
  if (params?.assignedTo) searchParams.set("assignedTo", params.assignedTo);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const res = await fetchWithAuth(`${API_URL}/api/incidents?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des incidents");
  return res.json();
}

export async function fetchIncident(id: string): Promise<IncidentDto> {
  const res = await fetchWithAuth(`${API_URL}/api/incidents/${id}`);
  if (!res.ok) throw new Error("Échec du chargement de l'incident");
  return res.json();
}

export async function createIncident(data: {
  title: string;
  severity: string;
  siteId: string;
  description?: string;
  sourceType?: string;
  sourceId?: string;
}): Promise<IncidentDto> {
  const res = await fetchWithAuth(`${API_URL}/api/incidents`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de création de l'incident");
  }
  return res.json();
}

export async function updateIncidentStatus(
  id: string,
  status: string,
  reason?: string,
): Promise<IncidentDto> {
  const res = await fetchWithAuth(`${API_URL}/api/incidents/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de la mise à jour du statut");
  }
  return res.json();
}

export async function assignIncident(
  id: string,
  userId: string,
  note?: string,
): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/incidents/${id}/assign`, {
    method: "POST",
    body: JSON.stringify({ userId, note }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'assignation de l'incident");
  }
}

export async function addIncidentComment(id: string, text: string): Promise<IncidentCommentDto> {
  const res = await fetchWithAuth(`${API_URL}/api/incidents/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'ajout du commentaire");
  }
  return res.json();
}

export async function fetchIncidentComments(id: string): Promise<IncidentCommentDto[]> {
  const res = await fetchWithAuth(`${API_URL}/api/incidents/${id}/comments`);
  if (!res.ok) throw new Error("Échec du chargement des commentaires");
  return res.json();
}

export async function fetchIncidentHistory(id: string): Promise<IncidentHistoryDto> {
  const res = await fetchWithAuth(`${API_URL}/api/incidents/${id}/history`);
  if (!res.ok) throw new Error("Échec du chargement de l'historique");
  return res.json();
}

// ─── Incident Evidence Types & API Functions ───

export interface IncidentEvidenceDto {
  id: string;
  incidentId: string;
  type: string;
  url?: string | null;
  eventType?: string | null;
  eventId?: string | null;
  description?: string | null;
  uploadedById: string;
  uploaderName?: string | null;
  createdAt: string;
}

export async function fetchIncidentEvidence(incidentId: string): Promise<IncidentEvidenceDto[]> {
  const res = await fetchWithAuth(`${API_URL}/api/incidents/${incidentId}/evidence`);
  if (!res.ok) throw new Error("Échec du chargement des preuves");
  return res.json();
}

export async function addIncidentEvidence(
  incidentId: string,
  data: {
    type: "video_clip" | "snapshot" | "access_event" | "document" | "note";
    url?: string;
    eventType?: string;
    eventId?: string;
    description?: string;
  },
): Promise<IncidentEvidenceDto> {
  const res = await fetchWithAuth(`${API_URL}/api/incidents/${incidentId}/evidence`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'ajout de la preuve");
  }
  return res.json();
}

export async function removeIncidentEvidence(incidentId: string, evidenceId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/incidents/${incidentId}/evidence/${evidenceId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Échec de la suppression de la preuve");
}

export async function downloadIncidentReport(incidentId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/incidents/${incidentId}/report`);
  if (!res.ok) throw new Error("Erreur lors du téléchargement du rapport");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `incident-${incidentId.substring(0, 8)}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}