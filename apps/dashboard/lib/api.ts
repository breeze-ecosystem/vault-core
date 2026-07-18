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
  organizationId: string;
  resolution: string | null;
  fps: number;
  captureInterval: number;
  isRecording: boolean;
  lastSnapshotUrl: string | null;
  lastHeartbeat: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
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

export interface Organization {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  billingEmail: string | null;
  planTier: string;
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
  organizations: {
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

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Registration failed");
  if (typeof window !== "undefined") {
    if (result.accessToken) sessionStorage.setItem("accessToken", result.accessToken);
    if (result.user) sessionStorage.setItem("user", JSON.stringify(result.user));
    if (result.organization) sessionStorage.setItem("organization", JSON.stringify(result.organization));
  }
  return result;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetchWithAuth(`${API_URL}/api/dashboard/stats`);
  if (!res.ok) throw new Error("Failed to fetch dashboard stats");
  return res.json();
}

export async function fetchCameras(params?: {
  page?: number;
  limit?: number;
  status?: string;
  organizationId?: string;
}): Promise<PaginatedResponse<Camera>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.status) searchParams.set("status", params.status);
  if (params?.organizationId) searchParams.set("organizationId", params.organizationId);

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

export async function fetchOrganizations(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Organization>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const res = await fetchWithAuth(`${API_URL}/api/organizations?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch organizations");
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

// --- Organization actions ---

export async function createOrganization(data: { name: string; address?: string; city?: string; country?: string }): Promise<Organization> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create organization");
  return res.json();
}

export async function updateOrganization(id: string, data: any): Promise<Organization> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update organization");
  return res.json();
}

// --- Camera actions ---

export async function createCamera(data: { name: string; rtspUrl: string; organizationId: string; resolution?: string; fps?: number; captureInterval?: number }): Promise<Camera> {
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

export async function createUser(data: { email: string; password: string; firstName: string; lastName: string; role: string }): Promise<DashboardUser> {
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

export async function deleteOrganization(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete organization");
}

// --- Invite actions ---

export async function fetchInvites(orgId: string): Promise<any[]> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/${orgId}/invites`);
  if (!res.ok) throw new Error("Failed to fetch invites");
  return res.json();
}

export async function createInvite(orgId: string, data: { email: string; role: string }): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/${orgId}/invites`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create invite");
  return res.json();
}

export async function revokeInvite(orgId: string, inviteId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/${orgId}/invites/${inviteId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to revoke invite");
}

export async function resendInvite(orgId: string, inviteId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/${orgId}/invites/${inviteId}/resend`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to resend invite");
}

export async function acceptInvite(data: {
  token: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ success: boolean; message?: string; accessToken?: string; user?: any; organization?: any }> {
  const res = await fetch(`${API_URL}/api/auth/accept-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Échec de l'acceptation");
  if (typeof window !== "undefined") {
    if (result.accessToken) sessionStorage.setItem("accessToken", result.accessToken);
    if (result.user) sessionStorage.setItem("user", JSON.stringify(result.user));
    if (result.organization) sessionStorage.setItem("organization", JSON.stringify(result.organization));
  }
  return result;
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

export async function fetchAllDoorStates(orgId?: string): Promise<DoorStateDto[]> {
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
  organizationId: string;
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
  organizationId: string,
  params?: { from?: string; to?: string; limit?: number },
): Promise<{ data: TimelineEntryDto[] }> {
  const searchParams = new URLSearchParams();
  searchParams.set("organizationId", organizationId);
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
  searchParams.set("organizationId", params.organizationId);
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

// ─── Visitor Types ───

export interface VisitorDto {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisitDto {
  id: string;
  visitorId: string;
  hostUserId: string;
  hostName?: string;
  purpose?: string;
  validFrom: string;
  validUntil: string;
  credentialId?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  status: string;
  zoneRestrictions?: string[];
  createdAt: string;
  updatedAt: string;
  visitor?: VisitorDto;
}

// ─── Visitor API Functions ───

export async function preregisterVisitor(data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  hostUserId: string;
  purpose?: string;
  validFrom: string;
  validUntil: string;
  zoneIds?: string[];
}): Promise<{ visit: VisitDto; qrCode: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/visitors/preregister`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de la pré-inscription du visiteur");
  }
  return res.json();
}

export async function checkInVisit(visitId: string): Promise<VisitDto> {
  const res = await fetchWithAuth(`${API_URL}/api/visitors/visits/${visitId}/check-in`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'enregistrement d'arrivée");
  }
  return res.json();
}

export async function checkOutVisit(visitId: string): Promise<VisitDto> {
  const res = await fetchWithAuth(`${API_URL}/api/visitors/visits/${visitId}/check-out`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'enregistrement de départ");
  }
  return res.json();
}

export async function cancelVisit(visitId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/visitors/visits/${visitId}/cancel`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'annulation de la visite");
  }
}

export async function fetchVisits(params?: {
  status?: string;
  hostUserId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: VisitDto[]; total: number; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.hostUserId) searchParams.set("hostUserId", params.hostUserId);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const res = await fetchWithAuth(`${API_URL}/api/visitors/visits?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des visites");
  return res.json();
}

export async function fetchVisit(id: string): Promise<VisitDto> {
  const res = await fetchWithAuth(`${API_URL}/api/visitors/visits/${id}`);
  if (!res.ok) throw new Error("Échec du chargement de la visite");
  return res.json();
}

export async function fetchVisitors(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: VisitorDto[]; total: number; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const res = await fetchWithAuth(`${API_URL}/api/visitors?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des visiteurs");
  return res.json();
}

export async function fetchVisitor(id: string): Promise<VisitorDto & { visits: VisitDto[] }> {
  const res = await fetchWithAuth(`${API_URL}/api/visitors/${id}`);
  if (!res.ok) throw new Error("Échec du chargement du visiteur");
  return res.json();
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

// ─── ANPR/Vehicle Types ───

export interface VehicleListEntryDto {
  id: string;
  type: "allowlist" | "blocklist";
  plate: string;
  siteId: string;
  description?: string | null;
  isActive: boolean;
  createdById: string;
  createdBy?: { firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleEventDto {
  time: string;
  siteId: string;
  cameraId?: string | null;
  plate: string;
  confidence?: number | null;
  imageUrl?: string | null;
  decision: string;
  reason?: string | null;
}

// ─── ANPR/Vehicle API Functions ───

export async function evaluatePlate(frame: string, cameraId: string, siteId: string): Promise<{ plates: { plate: string; confidence: number; bbox: number[] }[] }> {
  const res = await fetchWithAuth(`${API_URL}/api/anpr/evaluate`, {
    method: "POST",
    body: JSON.stringify({ imageBase64: frame, cameraId, siteId }),
  });
  if (!res.ok) throw new Error("Échec de l'analyse de la plaque");
  return res.json();
}

export async function fetchVehicleEvents(params?: {
  plate?: string;
  siteId?: string;
  from?: string;
  to?: string;
  decision?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: VehicleEventDto[]; total: number; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  if (params?.plate) searchParams.set("plate", params.plate);
  if (params?.siteId) searchParams.set("siteId", params.siteId);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  if (params?.decision) searchParams.set("decision", params.decision);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const res = await fetchWithAuth(`${API_URL}/api/anpr/events?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des événements véhicules");
  return res.json();
}

export async function fetchVehicleList(type?: string): Promise<VehicleListEntryDto[]> {
  const params = type ? `?type=${type}` : "";
  const res = await fetchWithAuth(`${API_URL}/api/vehicles/list${params}`);
  if (!res.ok) throw new Error("Échec du chargement des listes véhicules");
  return res.json();
}

export async function createVehicleListEntry(data: {
  type: string;
  plate: string;
  siteId: string;
  description?: string;
}): Promise<VehicleListEntryDto> {
  const res = await fetchWithAuth(`${API_URL}/api/vehicles/list`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'ajout à la liste");
  }
  return res.json();
}

export async function updateVehicleListEntry(
  id: string,
  data: { description?: string; isActive?: boolean },
): Promise<VehicleListEntryDto> {
  const res = await fetchWithAuth(`${API_URL}/api/vehicles/list/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la modification de l'entrée");
  return res.json();
}

export async function deleteVehicleListEntry(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/vehicles/list/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Échec de la suppression de l'entrée");
}

// ─── AI Types ───

export interface AIQueryResultDto {
  query: string;
  spec: { event_types: string[]; filters: Record<string, string>; query_summary: string };
  results: any[];
  summary: string;
}

export interface AssistantResponseDto {
  answer: string;
  sources: { type: string; time: string; summary: string }[];
}

export interface AIStatusDto {
  ollamaConnected: boolean;
  model: string;
  embeddingModel: string;
}

export interface AIIncidentSummaryDto {
  summary: string;
  keyEvents: string[];
  recommendedActions: string[];
}

// ─── AI API Functions ───

export async function aiQuery(query: string): Promise<AIQueryResultDto> {
  const res = await fetchWithAuth(`${API_URL}/api/ai/query`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de la requête IA");
  }
  return res.json();
}

export async function aiSummarize(incidentId: string): Promise<AIIncidentSummaryDto> {
  const res = await fetchWithAuth(`${API_URL}/api/ai/summarize`, {
    method: "POST",
    body: JSON.stringify({ incidentId }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de la génération du résumé");
  }
  return res.json();
}

export async function aiAssistant(question: string): Promise<AssistantResponseDto> {
  const res = await fetchWithAuth(`${API_URL}/api/ai/assistant`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de la requête à l'assistant");
  }
  return res.json();
}

export async function aiStatus(): Promise<AIStatusDto> {
  const res = await fetchWithAuth(`${API_URL}/api/ai/status`);
  if (!res.ok) throw new Error("Échec de la vérification du statut IA");
  return res.json();
}

// ─── Agent (Phase 09-06) Types ───

export interface AgentChatResponse {
  sessionId: string;
  response: string;
  toolCalls?: Array<{
    type: string;
    name?: string;
    input?: unknown;
    output?: unknown;
  }>;
  error?: string;
}

export interface RiskExplanation {
  zoneName: string;
  zoneId: string;
  currentScore: number;
  scoreBreakdown: Record<string, number>;
  contributingEvents: Array<{
    type: string;
    description: string;
    time: string;
    impact: string;
  }>;
  aiSummary: string;
  recommendations: string[];
}

export interface AgentStatusResponse {
  ollamaAvailable: boolean;
  agentsCount: number;
  modelStatus: Record<string, boolean>;
}

// ─── Agent API Functions (Phase 09-06) ───

/**
 * Synchronous fallback for agent chat (non-SSE).
 * POST /api/ai/agent-chat
 */
export async function agentChat(message: string): Promise<AgentChatResponse> {
  const res = await fetchWithAuth(`${API_URL}/api/ai/agent-chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de la communication avec l'agent");
  }
  return res.json();
}

/**
 * SSE streaming agent chat helper.
 * Uses fetchWithAuth with ReadableStream for authenticated SSE support.
 * Returns a cleanup function to abort the stream.
 */
export function createAgentChatStream(
  message: string,
  sessionId: string,
  callbacks: {
    onToken: (token: string) => void;
    onToolCall: (toolCall: Record<string, unknown>) => void;
    onDone: (content: string) => void;
    onError: (error: string) => void;
  },
): () => void {
  const abortController = new AbortController();
  const encodedMessage = encodeURIComponent(message);
  const encodedSession = encodeURIComponent(sessionId);

  // Use fetchWithAuth for SSE (supports auth token + 401 refresh)
  fetchWithAuth(
    `${API_URL}/api/ai-agent/chat?message=${encodedMessage}&sessionId=${encodedSession}`,
    { signal: abortController.signal },
  )
    .then(async (response) => {
      if (!response.ok) {
        callbacks.onError(`Erreur HTTP ${response.status}`);
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError("Flux de réponse non disponible");
        return;
      }
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (!data) continue;

              try {
                const event = JSON.parse(data);
                switch (event.type) {
                  case "token":
                    callbacks.onToken(event.data ?? "");
                    break;
                  case "tool_call":
                    callbacks.onToolCall(event);
                    break;
                  case "done":
                    callbacks.onDone(event.data ?? "");
                    return;
                  case "error":
                    callbacks.onError(event.data ?? "Erreur inconnue");
                    return;
                }
              } catch {
                // Non-JSON line (e.g., keepalive comment)
              }
            }
          }
        }

        // Process remaining buffer
        if (buffer.startsWith("data: ")) {
          try {
            const event = JSON.parse(buffer.slice(6).trim());
            if (event.type === "done") {
              callbacks.onDone(event.data ?? "");
            }
          } catch {
            // ignore
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          callbacks.onError(err.message || "Erreur de flux SSE");
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        callbacks.onError(err.message || "Échec de la connexion SSE");
      }
    });

  return () => abortController.abort();
}

/**
 * GET /api/risk/scores/:zoneId/explain — AI risk score explanation.
 */
export async function explainRisk(zoneId: string): Promise<RiskExplanation> {
  const res = await fetchWithAuth(
    `${API_URL}/api/risk/scores/${zoneId}/explain`,
  );
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'explication du risque");
  }
  return res.json();
}

/**
 * GET /api/patterns/:patternId/analyze — AI pattern trend analysis.
 */
export async function analyzePattern(patternId: string): Promise<any> {
  const res = await fetchWithAuth(
    `${API_URL}/api/patterns/${patternId}/analyze`,
  );
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'analyse du motif");
  }
  return res.json();
}

/**
 * GET /api/ai-agent/status — Agent system health.
 */
export async function getAgentStatus(): Promise<AgentStatusResponse> {
  const res = await fetchWithAuth(`${API_URL}/api/ai-agent/status`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec du statut de l'agent");
  }
  return res.json();
}

// ─── Predictive Health Types (Plan 03-04) ───

export interface PredictionDto {
  id: string;
  time: string;
  siteId: string;
  deviceType: string;
  deviceId: string;
  deviceName?: string;
  metric: string;
  currentValue: number;
  failureThreshold: number;
  slope: number;
  hoursToFailure: number | null;
  confidence: "high" | "medium" | "low";
  dataPoints: number;
  triggeredAlert: boolean;
}

export interface CameraDoorAssociationDto {
  cameraId: string;
  cameraName: string;
  doorId?: string;
  doorName?: string;
  doorZoneId?: string;
  angle?: string;
  priority: number;
  status: "mapped" | "orphan_camera" | "orphan_door" | "zone_mismatch";
}

export interface PredictiveSummaryDto {
  totalPredictions: number;
  criticalPredictions: number;
  byDeviceType: { camera: number; reader: number; controller: number };
}

// ─── Predictive Health API Functions (Plan 03-04) ───

export async function fetchPredictions(params?: {
  siteId?: string;
  deviceType?: string;
  metric?: string;
  triggeredAlert?: string;
}): Promise<PredictionDto[]> {
  const searchParams = new URLSearchParams();
  if (params?.siteId) searchParams.set("siteId", params.siteId);
  if (params?.deviceType) searchParams.set("deviceType", params.deviceType);
  if (params?.metric) searchParams.set("metric", params.metric);
  if (params?.triggeredAlert) searchParams.set("triggeredAlert", params.triggeredAlert);
  const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const res = await fetchWithAuth(`${API_URL}/api/equipment/predictions${qs}`);
  if (!res.ok) throw new Error("Échec du chargement des prédictions");
  return res.json();
}

export async function fetchPredictiveSummary(siteId?: string): Promise<PredictiveSummaryDto> {
  const params = siteId ? `?siteId=${siteId}` : "";
  const res = await fetchWithAuth(`${API_URL}/api/equipment/predictions/summary${params}`);
  if (!res.ok) throw new Error("Échec du chargement du résumé prédictif");
  return res.json();
}

export async function fetchCameraDoorAssociations(siteId?: string): Promise<CameraDoorAssociationDto[]> {
  const params = siteId ? `?siteId=${siteId}` : "";
  const res = await fetchWithAuth(`${API_URL}/api/equipment/camera-door-map${params}`);
  if (!res.ok) throw new Error("Échec du chargement de la cartographie caméra-porte");
  return res.json();
}

export async function triggerPredictionCycle(): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/equipment/predictions/run`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Échec du déclenchement de l'analyse prédictive");
}

// ─── Equipment Health Types ───

export interface CameraHealthDto {
  id: string;
  name: string;
  status: string;
  siteId: string;
  siteName?: string;
  lastHeartbeat?: string | null;
  isRecording: boolean;
  fps?: number;
  latestHealth?: { status: string; time: string } | null;
}

export interface ReaderHealthDto {
  reader_id: string;
  site_id: string;
  status: string;
  failed_reads?: number;
  response_time_ms?: number;
  last_connected?: string;
  firmware_version?: string;
  time?: string;
}

export interface ControllerHealthDto {
  controller_id: string;
  site_id: string;
  battery_level?: number;
  connection_stability?: string;
  firmware_version?: string;
  cpu_load?: number;
  memory_usage?: number;
  time?: string;
}

// ─── Equipment Health API Functions ───

export async function fetchCameraHealth(): Promise<CameraHealthDto[]> {
  const res = await fetchWithAuth(`${API_URL}/api/equipment/cameras`);
  if (!res.ok) throw new Error("Échec du chargement de la santé des caméras");
  return res.json();
}

export async function fetchCameraHealthHistory(
  cameraId: string,
  from?: string,
  to?: string,
): Promise<any[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetchWithAuth(
    `${API_URL}/api/equipment/cameras/${cameraId}/history?${params.toString()}`,
  );
  if (!res.ok) throw new Error("Échec du chargement de l'historique de la caméra");
  return res.json();
}

export async function fetchReaderHealth(): Promise<ReaderHealthDto[]> {
  const res = await fetchWithAuth(`${API_URL}/api/equipment/readers`);
  if (!res.ok) throw new Error("Échec du chargement de la santé des lecteurs");
  return res.json();
}

export async function fetchReaderHealthHistory(
  readerId: string,
  from?: string,
  to?: string,
): Promise<any[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetchWithAuth(
    `${API_URL}/api/equipment/readers/${readerId}/history?${params.toString()}`,
  );
  if (!res.ok) throw new Error("Échec du chargement de l'historique du lecteur");
  return res.json();
}

export async function fetchControllerHealth(): Promise<ControllerHealthDto[]> {
  const res = await fetchWithAuth(`${API_URL}/api/equipment/controllers`);
  if (!res.ok) throw new Error("Échec du chargement de la santé des contrôleurs");
  return res.json();
}

export async function fetchControllerHealthHistory(
  controllerId: string,
  from?: string,
  to?: string,
): Promise<any[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetchWithAuth(
    `${API_URL}/api/equipment/controllers/${controllerId}/history?${params.toString()}`,
  );
  if (!res.ok) throw new Error("Échec du chargement de l'historique du contrôleur");
  return res.json();
}

// ─── Governance Types ───

export interface RetentionPolicyDto {
  id: string;
  eventType: string;
  tableType: string;
  retentionDays: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GovernanceStatusDto {
  encryptionConfigured: boolean;
}

// ─── Governance API Functions ───

export async function fetchRetentionPolicies(): Promise<RetentionPolicyDto[]> {
  const res = await fetchWithAuth(`${API_URL}/api/governance/retention-policies`);
  if (!res.ok) throw new Error("Échec du chargement des politiques de rétention");
  return res.json();
}

export async function createRetentionPolicy(data: {
  eventType: string;
  tableType: string;
  retentionDays: number;
  enabled?: boolean;
}): Promise<RetentionPolicyDto> {
  const res = await fetchWithAuth(`${API_URL}/api/governance/retention-policies`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de création de la politique");
  }
  return res.json();
}

export async function updateRetentionPolicy(
  id: string,
  data: { retentionDays?: number; enabled?: boolean },
): Promise<RetentionPolicyDto> {
  const res = await fetchWithAuth(`${API_URL}/api/governance/retention-policies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour de la politique");
  return res.json();
}

export async function deleteRetentionPolicy(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/governance/retention-policies/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Échec de la suppression de la politique");
}

export async function fetchGovernanceStatus(): Promise<GovernanceStatusDto> {
  const res = await fetchWithAuth(`${API_URL}/api/governance/status`);
  if (!res.ok) return { encryptionConfigured: false };
  return res.json();
}

export async function testEncrypt(value: string): Promise<{ encrypted: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/governance/encrypt`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error("Échec du test de chiffrement");
  return res.json();
}

export async function testDecrypt(value: string): Promise<{ decrypted: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/governance/decrypt`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error("Échec du test de déchiffrement");
  return res.json();
}

// ─── Security Analytics Types ───

export interface ZoneAnalyticsDto {
  zoneId: string; siteId: string; zoneName: string; bucket: string;
  deniedCount: number; grantedCount: number; doorAnomalyCount: number;
  unsecuredCount: number; activeDoors: number;
}

export interface SiteAnalyticsDto {
  siteId: string; siteName: string; bucket: string;
  totalDenied: number; totalGranted: number; doorsWithAnomalies: number;
  doorsUnsecured: number; incidentsCreated: number;
}

export interface IntrusionEventDto {
  id: string; zoneId: string; siteId: string; doorId?: string;
  detectedAt: string; cameraId?: string; snapshotUrl?: string;
  confidence: number; status: string;
}

export interface LoiteringEventDto {
  id: string; zoneId: string; siteId: string; startedAt: string;
  durationSeconds: number; doorId?: string; maxConfidence?: number; cameraId?: string; status: string;
}

export interface AbnormalActivityDto {
  zoneId: string; siteId: string; metric: string;
  currentValue: number; baselineMean: number; deviation: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH'; detectedAt: string;
}

export interface AnalyticsTrendPoint { bucket: string; value: number; metric: string; }

// ─── Security Analytics API Functions ───

export async function fetchZoneAnalytics(params?: {
  siteId?: string; zoneId?: string; from?: string; to?: string; granularity?: string;
}): Promise<ZoneAnalyticsDto[]> {
  const searchParams = new URLSearchParams();
  if (params?.siteId) searchParams.set("siteId", params.siteId);
  if (params?.zoneId) searchParams.set("zoneId", params.zoneId);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  if (params?.granularity) searchParams.set("granularity", params.granularity);

  const res = await fetchWithAuth(`${API_URL}/api/analytics/zones?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des analyses de sécurité");
  return res.json();
}

export async function fetchSiteAnalytics(params?: {
  siteId?: string; from?: string; to?: string;
}): Promise<SiteAnalyticsDto[]> {
  const searchParams = new URLSearchParams();
  if (params?.siteId) searchParams.set("siteId", params.siteId);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);

  const res = await fetchWithAuth(`${API_URL}/api/analytics/sites?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des analyses de sécurité");
  return res.json();
}

export async function fetchIntrusionEvents(params?: {
  siteId?: string; from?: string; to?: string;
}): Promise<IntrusionEventDto[]> {
  const searchParams = new URLSearchParams();
  if (params?.siteId) searchParams.set("siteId", params.siteId);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);

  const res = await fetchWithAuth(`${API_URL}/api/analytics/intrusions?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des intrusions");
  return res.json();
}

export async function fetchLoiteringEvents(params?: {
  siteId?: string; from?: string; to?: string;
}): Promise<LoiteringEventDto[]> {
  const searchParams = new URLSearchParams();
  if (params?.siteId) searchParams.set("siteId", params.siteId);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);

  const res = await fetchWithAuth(`${API_URL}/api/analytics/loitering?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des flâneries");
  return res.json();
}

export async function fetchUnusualAbsence(params?: {
  siteId?: string; zoneId?: string;
}): Promise<AbnormalActivityDto[]> {
  const searchParams = new URLSearchParams();
  if (params?.siteId) searchParams.set("siteId", params.siteId);
  if (params?.zoneId) searchParams.set("zoneId", params.zoneId);

  const res = await fetchWithAuth(`${API_URL}/api/analytics/absence?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des absences");
  return res.json();
}

export async function fetchAbnormalActivity(params?: {
  siteId?: string; zoneId?: string;
}): Promise<AbnormalActivityDto[]> {
  const searchParams = new URLSearchParams();
  if (params?.siteId) searchParams.set("siteId", params.siteId);
  if (params?.zoneId) searchParams.set("zoneId", params.zoneId);

  const res = await fetchWithAuth(`${API_URL}/api/analytics/abnormal?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des anomalies");
  return res.json();
}

export async function fetchAnalyticsTrends(
  siteId: string, metric: string, granularity?: string,
): Promise<AnalyticsTrendPoint[]> {
  const searchParams = new URLSearchParams({ siteId, metric });
  if (granularity) searchParams.set("granularity", granularity);

  const res = await fetchWithAuth(`${API_URL}/api/analytics/trends?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des tendances");
  return res.json();
}

// ─── Risk Scoring Types ───

export interface RiskFactors {
  deniedAttempts: number;
  openDoorAnomalies: number;
  anomalyEvents: number;
  activeIncidents: number;
  failedReaders: number;
  hoursSinceLastEvent: number;
}

export interface RiskScoreDto {
  zoneId: string;
  siteId: string;
  zoneName: string;
  siteName: string;
  score: number;
  smoothedScore: number;
  riskLevel: "low" | "moderate" | "elevated" | "critical";
  factors: RiskFactors;
  timestamp: string;
}

export interface RiskTrendPoint {
  timestamp: string;
  score: number;
  smoothedScore: number;
  riskLevel: string;
}

export interface SiteRiskSummary {
  siteId: string;
  siteName: string;
  averageScore: number;
  maxScore: number;
  zoneCount: number;
  criticalZones: number;
  elevatedZones: number;
  lastUpdated: string;
}

// ─── Risk Scoring API Functions ───

export async function fetchRiskScores(siteId?: string): Promise<RiskScoreDto[]> {
  const params = siteId ? `?siteId=${siteId}` : "";
  const res = await fetchWithAuth(`${API_URL}/api/risk/scores${params}`);
  if (!res.ok) throw new Error("Échec du chargement des scores de risque");
  return res.json();
}

export async function fetchZoneRiskScore(zoneId: string): Promise<RiskScoreDto> {
  const res = await fetchWithAuth(`${API_URL}/api/risk/scores/${zoneId}`);
  if (!res.ok) throw new Error("Échec du chargement du score de risque");
  return res.json();
}

export async function fetchZoneRiskHistory(
  zoneId: string,
  from?: string,
  to?: string,
): Promise<RiskTrendPoint[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetchWithAuth(`${API_URL}/api/risk/scores/${zoneId}/history${qs}`);
  if (!res.ok) throw new Error("Échec du chargement de l'historique de risque");
  return res.json();
}

export async function fetchSiteRiskSummaries(): Promise<SiteRiskSummary[]> {
  const res = await fetchWithAuth(`${API_URL}/api/risk/summary`);
  if (!res.ok) throw new Error("Échec du chargement des résumés de risque");
  return res.json();
}

// ─── Recurring Pattern Types ───

export interface DetectedPatternDto {
  id: string;
  time: string;
  siteId: string;
  patternId: string;
  patternName: string;
  deviceType: string;
  deviceId: string;
  occurrenceCount: number;
  severity: string;
  metadata?: any;
  resolved: boolean;
  resolvedAt?: string;
}

export interface PatternDefinition {
  id: string;
  name: string;
  description: string;
  deviceType: string;
  severity: string;
}

// ─── Recurring Pattern API Functions ───

export async function fetchDetectedPatterns(
  params?: Record<string, string>,
): Promise<{ data: DetectedPatternDto[]; total: number }> {
  const searchParams = new URLSearchParams(params || {});
  const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const res = await fetchWithAuth(`${API_URL}/api/patterns${qs}`);
  if (!res.ok) throw new Error("Échec du chargement des schémas récurrents");
  return res.json();
}

export async function fetchPatternDefinitions(): Promise<PatternDefinition[]> {
  const res = await fetchWithAuth(`${API_URL}/api/patterns/definitions`);
  if (!res.ok) throw new Error("Échec du chargement des définitions de schémas");
  return res.json();
}

export async function resolvePattern(
  patternId: string,
  deviceId: string,
): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/patterns/${patternId}/resolve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  if (!res.ok) throw new Error("Échec de la résolution du schéma");
}

export async function triggerPatternDetection(): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/patterns/detect`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Échec du déclenchement de la détection");
}

// ─── Maintenance Types (Plan 03-05) ───

export interface MaintenanceTicketDto {
  id: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  siteId: string;
  assignedToId?: string;
  assignedToName?: string;
  deviceType?: string;
  deviceId?: string;
  deviceName?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface UnifiedIncidentDto {
  id: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  ticketType: "SECURITY_INCIDENT" | "MAINTENANCE_TICKET";
  siteId: string;
  siteName?: string;
  assignedToName?: string;
  deviceType?: string;
  deviceName?: string;
  createdAt: string;
}

// ─── Maintenance API Functions ───

export async function fetchMaintenanceTickets(params?: {
  siteId?: string;
  deviceType?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: MaintenanceTicketDto[]; total: number; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  if (params?.siteId) searchParams.set("siteId", params.siteId);
  if (params?.deviceType) searchParams.set("deviceType", params.deviceType);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const res = await fetchWithAuth(`${API_URL}/api/maintenance/tickets?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des tickets de maintenance");
  return res.json();
}

export async function fetchMaintenanceTicket(id: string): Promise<MaintenanceTicketDto> {
  const res = await fetchWithAuth(`${API_URL}/api/maintenance/tickets/${id}`);
  if (!res.ok) throw new Error("Échec du chargement du ticket");
  return res.json();
}

export async function createMaintenanceTicket(data: {
  title: string;
  severity: string;
  siteId: string;
  deviceType: string;
  deviceId: string;
  deviceName?: string;
  description?: string;
}): Promise<MaintenanceTicketDto> {
  const res = await fetchWithAuth(`${API_URL}/api/maintenance/tickets`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de création du ticket");
  }
  return res.json();
}

export async function updateMaintenanceTicketStatus(
  id: string,
  status: string,
): Promise<MaintenanceTicketDto> {
  const res = await fetchWithAuth(`${API_URL}/api/maintenance/tickets/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de la mise à jour du statut");
  }
  return res.json();
}

export async function assignMaintenanceTicket(
  id: string,
  userId: string,
): Promise<MaintenanceTicketDto> {
  const res = await fetchWithAuth(`${API_URL}/api/maintenance/tickets/${id}/assign`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'assignation du ticket");
  }
  return res.json();
}

export async function fetchUnifiedIncidents(params?: {
  siteId?: string;
  ticketType?: string;
  status?: string;
  severity?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: UnifiedIncidentDto[]; total: number; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  if (params?.siteId) searchParams.set("siteId", params.siteId);
  if (params?.ticketType) searchParams.set("ticketType", params.ticketType);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.severity) searchParams.set("severity", params.severity);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const res = await fetchWithAuth(`${API_URL}/api/maintenance/unified?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement de la vue unifiée");
  return res.json();
}

// ─── License Types ───

export interface LicenseStatusDto {
  licenseState: 'trial' | 'active' | 'grace' | 'expired' | 'no_license';
  expiresAt?: string;
  graceEndsAt?: string;
  trialEndsAt?: string;
  maxCameras?: number;
  maxDoors?: number;
  isUnlimited?: boolean;
}

export interface LicenseUsageDto {
  cameras: { current: number; max: number | null };
  doors: { current: number; max: number | null };
}

export interface LicenseDto {
  id: string;
  organizationId: string;
  licenseJwt: string;
  status: string;
  activatedAt: string | null;
  expiresAt: string;
  maxCameras: number;
  maxDoors: number;
  gracePeriodDays: number;
  licenseVersion: number;
  createdAt: string;
  organization?: { id: string; name: string };
}

// ─── License API Functions ───

export async function getLicenseStatus(): Promise<LicenseStatusDto> {
  const res = await fetchWithAuth(`${API_URL}/api/licenses/status`);
  if (!res.ok) throw new Error('Échec du chargement du statut de la licence');
  return res.json();
}

export async function getLicenseUsage(): Promise<LicenseUsageDto> {
  const res = await fetchWithAuth(`${API_URL}/api/licenses/usage`);
  if (!res.ok) throw new Error("Échec du chargement de l'utilisation");
  return res.json();
}

export async function activateLicense(licenseJwt: string): Promise<{ status: string; claims: any }> {
  const res = await fetchWithAuth(`${API_URL}/api/licenses/activate`, {
    method: 'POST',
    body: JSON.stringify({ licenseJwt }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'activation de la licence");
  }
  return res.json();
}

export async function listLicenses(): Promise<LicenseDto[]> {
  const res = await fetchWithAuth(`${API_URL}/api/licenses`);
  if (!res.ok) throw new Error('Échec du chargement des licences');
  return res.json();
}

export async function startTrial(): Promise<{ status: string; trialEndsAt: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/licenses/trial`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec du démarrage de l'essai gratuit");
  }
  return res.json();
}

export async function listApiKeys(): Promise<{ id: string; name: string; keyPrefix: string; isActive: boolean; createdAt: string }[]> {
  const res = await fetchWithAuth(`${API_URL}/api/licenses/api-keys`);
  if (!res.ok) throw new Error('Échec du chargement des clés API');
  return res.json();
}

export async function createApiKey(name: string): Promise<{ rawKey: string; keyPrefix: string; id: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/licenses/api-keys`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de la création de la clé API");
  }
  return res.json();
}

export async function revokeApiKey(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/licenses/api-keys/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error("Échec de la révocation de la clé API");
}

// ─── Phase 8: SLA Config ───

export async function fetchSlaProfiles(orgId: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/${orgId}/sla`);
  if (!res.ok) throw new Error("Échec du chargement des profils SLA");
  return res.json();
}

export async function updateSlaProfiles(orgId: string, profiles: any): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/${orgId}/sla`, {
    method: "PUT",
    body: JSON.stringify(profiles),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour des profils SLA");
  return res.json();
}

// ─── Phase 8: ANPR Config ───

export async function fetchAnprThreshold(orgId: string): Promise<number> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/${orgId}/anpr-threshold`);
  if (!res.ok) throw new Error("Échec du chargement du seuil ANPR");
  const data = await res.json();
  return data;
}

export async function updateAnprThreshold(orgId: string, confidenceThreshold: number): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/${orgId}/anpr-threshold`, {
    method: "PUT",
    body: JSON.stringify({ confidenceThreshold }),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour du seuil ANPR");
  return res.json();
}

// ─── Phase 8: Health Thresholds ───

export async function fetchHealthThresholds(orgId: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/${orgId}/health-thresholds`);
  if (!res.ok) throw new Error("Échec du chargement des seuils de santé");
  return res.json();
}

export async function updateHealthThresholds(orgId: string, thresholds: any): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/${orgId}/health-thresholds`, {
    method: "PUT",
    body: JSON.stringify(thresholds),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour des seuils de santé");
  return res.json();
}

// ─── Phase 8: Door Config ───

export async function fetchDoorThresholds(orgId: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/doors/thresholds?orgId=${orgId}`);
  if (!res.ok) throw new Error("Échec du chargement des seuils de porte");
  return res.json();
}

export async function updateDoorThresholds(doorId: string, config: any): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/doors/${doorId}/thresholds`, {
    method: "PATCH",
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour des seuils de porte");
}

// ─── Phase 8: Incident SLA ───

export async function fetchSlaTimer(incidentId: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/incidents/${incidentId}/sla`);
  if (!res.ok) throw new Error("Échec du chargement du timer SLA");
  return res.json();
}

export async function triggerEvidenceBundle(incidentId: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/incidents/${incidentId}/auto-bundle`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Échec de la génération du bundle de preuves");
  return res.json();
}

// ─── Phase 8: ANPR ───

export async function fetchAnprConfidenceThreshold(orgId: string): Promise<number> {
  const res = await fetchWithAuth(`${API_URL}/api/anpr/threshold?orgId=${orgId}`);
  if (!res.ok) throw new Error("Échec du chargement du seuil de confiance ANPR");
  const data = await res.json();
  return data;
}

export async function updateAnprConfidenceThreshold(threshold: number): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/anpr/threshold`, {
    method: "PUT",
    body: JSON.stringify({ threshold }),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour du seuil ANPR");
}

// ─── Phase 8: Visitor ───

export async function sendHostApproval(visitId: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/visitors/${visitId}/request-approval`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Échec de la demande d'approbation");
  return res.json();
}

export async function approveVisit(visitId: string, approved: boolean, reason?: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/visitors/${visitId}/approve`, {
    method: "POST",
    body: JSON.stringify({ approved, reason }),
  });
  if (!res.ok) throw new Error("Échec de l'approbation de la visite");
  return res.json();
}

export async function setTimedPass(visitId: string, timeWindowStart: string, timeWindowEnd: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/visitors/${visitId}/timed-pass`, {
    method: "PATCH",
    body: JSON.stringify({ timeWindowStart, timeWindowEnd }),
  });
  if (!res.ok) throw new Error("Échec de la configuration du pass horaire");
  return res.json();
}

// ─── Phase 8: Credential Lifecycle ───

export async function revokeCredential(credentialId: string, reason: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/access/credentials/${credentialId}/revoke`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Échec de la révocation du justificatif");
}

export async function reissueCredential(credentialId: string, newValidUntil: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/access/credentials/${credentialId}/reissue`, {
    method: "POST",
    body: JSON.stringify({ newValidUntil }),
  });
  if (!res.ok) throw new Error("Échec de la réémission du justificatif");
  return res.json();
}

// ─── Phase 8: Analytics ───

export async function fetchZoneMetrics(orgId: string, from?: string, to?: string): Promise<any> {
  const params = new URLSearchParams({ orgId });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetchWithAuth(`${API_URL}/api/analytics/zones?${params.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des métriques de zone");
  return res.json();
}

export async function fetchTrendData(orgId: string, period: string): Promise<any> {
  const params = new URLSearchParams({ orgId, period });
  const res = await fetchWithAuth(`${API_URL}/api/analytics/trends?${params.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des tendances");
  return res.json();
}

export async function fetchHeatmapData(orgId: string, from?: string, to?: string): Promise<any> {
  const params = new URLSearchParams({ orgId });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetchWithAuth(`${API_URL}/api/analytics/heatmap?${params.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement de la carte de chaleur");
  return res.json();
}

// ─── Phase 8: Equipment Health ───

export async function fetchSiteHealth(orgId: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/equipment/health?orgId=${orgId}`);
  if (!res.ok) throw new Error("Échec du chargement de la santé du site");
  return res.json();
}

export async function fetchDeviceHealth(orgId: string, deviceType?: string): Promise<any> {
  const params = new URLSearchParams({ orgId });
  if (deviceType) params.set("deviceType", deviceType);
  const res = await fetchWithAuth(`${API_URL}/api/equipment/devices?${params.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement de la santé des équipements");
  return res.json();
}

// ─── SSO Configuration Types ───

export interface IdpConfig {
  configured: boolean;
  protocol?: "saml" | "oidc";
  metadataUrl?: string;
  entityId?: string;
  certificate?: string | null;
  attributeMappings?: Record<string, string>;
  isActive?: boolean;
  ssoEnforced?: boolean;
  clientId?: string;
  clientSecret?: string;
  issuerUrl?: string;
  entryPoint?: string;
}

// ─── SSO Configuration API Functions ───

export async function fetchIdpConfig(): Promise<IdpConfig | { configured: false }> {
  const res = await fetchWithAuth(`${API_URL}/api/auth/sso/config`);
  if (!res.ok) throw new Error("Échec du chargement de la configuration SSO");
  return res.json();
}

export async function saveIdpConfig(data: import("@repo/shared").CreateIdpConfigInput): Promise<IdpConfig> {
  const res = await fetchWithAuth(`${API_URL}/api/auth/sso/config`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'enregistrement de la configuration SSO");
  }
  return res.json();
}

// ─── Tenant API Key Types ───

export type ApiKey = TenantApiKey;

export interface TenantApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  rawKey: string; // Only returned once at creation
}

export interface ApiKeyUsageResponse {
  lastUsedAt: string | null;
  recentRequestCount: number;
}

// ─── Tenant API Key API Functions ───

export async function fetchApiKeys(): Promise<TenantApiKey[]> {
  const res = await fetchWithAuth(`${API_URL}/api/api-keys`);
  if (!res.ok) throw new Error("Échec du chargement des clés API");
  return res.json();
}

export async function createTenantApiKey(data: import("@repo/shared").CreateTenantApiKeyInput): Promise<CreateApiKeyResponse> {
  const res = await fetchWithAuth(`${API_URL}/api/api-keys`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de la création de la clé API");
  }
  return res.json();
}

export async function revokeTenantApiKey(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/api-keys/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Échec de la révocation de la clé API");
}

export async function fetchApiKeyUsage(id: string): Promise<ApiKeyUsageResponse> {
  const res = await fetchWithAuth(`${API_URL}/api/api-keys/${id}/usage`);
  if (!res.ok) throw new Error("Échec du chargement des statistiques d'utilisation");
  return res.json();
}

// ─── Webhook Types ───

export interface WebhookSubscription {
  id: string;
  organizationId: string;
  targetUrl: string;
  eventType: string;
  secret: string | null;
  isActive: boolean;
  retryCount: number;
  timeoutMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventType: string;
  url: string;
  status: "pending" | "delivered" | "failed" | "retrying";
  statusCode: number | null;
  responseBody: string | null;
  durationMs: number | null;
  attemptNumber: number;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

// ─── Webhook API Functions ───

export async function fetchWebhookSubscriptions(): Promise<WebhookSubscription[]> {
  const res = await fetchWithAuth(`${API_URL}/api/webhooks/subscriptions`);
  if (!res.ok) throw new Error("Échec du chargement des abonnements webhook");
  return res.json();
}

export async function createWebhookSubscription(data: import("@repo/shared").CreateWebhookSubscriptionInput): Promise<WebhookSubscription> {
  const res = await fetchWithAuth(`${API_URL}/api/webhooks/subscriptions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de la création de l'abonnement webhook");
  }
  return res.json();
}

export async function updateWebhookSubscription(
  id: string,
  data: import("@repo/shared").UpdateWebhookSubscriptionInput,
): Promise<WebhookSubscription> {
  const res = await fetchWithAuth(`${API_URL}/api/webhooks/subscriptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de la mise à jour de l'abonnement webhook");
  }
  return res.json();
}

export async function deleteWebhookSubscription(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/webhooks/subscriptions/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Échec de la suppression de l'abonnement webhook");
}

export async function fetchWebhookDeliveries(
  id: string,
  filters?: { status?: string; from?: string; to?: string },
): Promise<WebhookDelivery[]> {
  const searchParams = new URLSearchParams();
  if (filters?.status) searchParams.set("status", filters.status);
  if (filters?.from) searchParams.set("from", filters.from);
  if (filters?.to) searchParams.set("to", filters.to);
  const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const res = await fetchWithAuth(`${API_URL}/api/webhooks/subscriptions/${id}/deliveries${qs}`);
  if (!res.ok) throw new Error("Échec du chargement des livraisons webhook");
  return res.json();
}

export async function retryWebhookDelivery(subscriptionId: string, deliveryId: string): Promise<void> {
  const res = await fetchWithAuth(
    `${API_URL}/api/webhooks/subscriptions/${subscriptionId}/retry/${deliveryId}`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error("Échec de la relance de la livraison webhook");
}

// ─── Compliance API Functions ───

export type ComplianceReportType = "soc2" | "iso27001" | "access-review";

export async function generateComplianceReport(reportType: ComplianceReportType, dateRange?: { from: string; to: string }): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/compliance/reports/generate`, {
    method: "POST",
    body: JSON.stringify({ reportType, dateRange }),
  });
  if (!res.ok) throw new Error("Échec de la génération du rapport de conformité");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `compliance-report-${new Date().toISOString().split("T")[0]}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// ─── Organization Branding Types & API Functions ───

export interface OrganizationBranding {
  logoUrl?: string;
  primaryColor?: string;
  displayName?: string;
}

export async function fetchOrganizationBranding(): Promise<OrganizationBranding> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/me`);
  if (!res.ok) throw new Error("Échec du chargement des informations de l'organisation");
  const org = await res.json();
  return {
    logoUrl: org.logoUrl,
    primaryColor: org.primaryColor,
    displayName: org.name,
  };
}

export async function updateOrganizationBranding(data: {
  logoUrl?: string;
  primaryColor?: string;
  displayName?: string;
}): Promise<Organization> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/branding`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de la mise à jour de l'image de marque");
  }
  return res.json();
}

// ─── Door Commands (Phase 2, D-04) ───

export async function sendDoorCommand(doorId: string, command: "lock" | "unlock"): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/doors/${doorId}/cmd`, {
    method: "POST",
    body: JSON.stringify({ command }),
  });
  if (!res.ok) throw new Error("Échec de la commande porte");
}

export async function createDoor(data: {
  name: string; siteId: string; zoneId: string;
  location?: string; controllerId?: string;
}): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/doors`, {
    method: "POST", body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la création de porte");
  return res.json();
}

// ─── Camera-Door Association (Phase 2, D-10) ───

export async function fetchCameraMaps(doorId: string): Promise<any[]> {
  const res = await fetchWithAuth(`${API_URL}/api/doors/${doorId}/camera-maps`);
  if (!res.ok) throw new Error("Échec du chargement des associations caméra");
  return res.json();
}

export async function createCameraMap(doorId: string, data: {
  cameraId: string; angle?: string; priority?: number;
}): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/doors/${doorId}/camera-maps`, {
    method: "POST", body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de l'association caméra-porte");
  return res.json();
}

export async function deleteCameraMap(mapId: string): Promise<void> {
  await fetchWithAuth(`${API_URL}/api/doors/${mapId.split("-")[0]}/camera-maps/${mapId}`, {
    method: "DELETE",
  });
}

// ─── PTZ Commands (Phase 2, D-06, D-16) ───

export async function ptzContinuousMove(
  cameraId: string, pan: number, tilt: number, zoom: number,
): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/ptz/continuous`, {
    method: "POST", body: JSON.stringify({ pan, tilt, zoom }),
  });
  if (!res.ok) throw new Error("Échec de la commande PTZ");
}

export async function ptzStop(cameraId: string): Promise<void> {
  await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/ptz/stop`, { method: "POST" });
}

export async function ptzGotoPreset(cameraId: string, presetToken: string): Promise<void> {
  await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/ptz/goto-preset`, {
    method: "POST", body: JSON.stringify({ presetToken }),
  });
}

export async function ptzSavePreset(cameraId: string, name: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/ptz/save-preset`, {
    method: "POST", body: JSON.stringify({ name }),
  });
  return res.json();
}

// ─── Controller Enrollment (Phase 2, D-17) ───

export async function fetchControllers(): Promise<any[]> {
  const res = await fetchWithAuth(`${API_URL}/api/controllers`);
  if (!res.ok) throw new Error("Échec du chargement des contrôleurs");
  return res.json();
}

export async function enrollController(
  controllerId: string, data: { name: string; siteId: string; zoneId?: string },
): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/controllers/${controllerId}/enroll`, {
    method: "PATCH", body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de l'enregistrement du contrôleur");
}

// ─── VISION Pack API Functions (Phase 02-06) ───

// ─── Stream management ───

export async function getCamerasWithStreams(): Promise<Camera[]> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/streams`);
  if (!res.ok) throw new Error("Échec du chargement des flux caméras");
  return res.json();
}

export async function getCameraDetail(id: string): Promise<Camera> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${id}/detail`);
  if (!res.ok) throw new Error("Échec du chargement des détails de la caméra");
  return res.json();
}

export async function updateSubstream(id: string, substreamUrl: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${id}/substream`, {
    method: "PATCH",
    body: JSON.stringify({ substreamUrl }),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour du sous-flux");
}

export async function toggleRecording(id: string): Promise<{ isRecording: boolean }> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${id}/recording/toggle`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Échec du basculement de l'enregistrement");
  return res.json();
}

// ─── ONVIF Scan ───

export interface OnvifDevice {
  id: string;
  model: string;
  ip: string;
  onvifVersion: string;
  compatible: boolean;
  manufacturer?: string;
}

export interface OnvifScanResult {
  scanId: string;
  devices: OnvifDevice[];
  status: 'scanning' | 'complete' | 'error';
  error?: string;
}

export async function startOnvifScan(subnet: string): Promise<OnvifScanResult> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/onvif/scan`, {
    method: "POST",
    body: JSON.stringify({ subnet }),
  });
  if (!res.ok) throw new Error("Échec du lancement du scan ONVIF");
  return res.json();
}

export async function getOnvifResults(scanId: string): Promise<OnvifScanResult> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/onvif/scan/${scanId}`);
  if (!res.ok) throw new Error("Échec du chargement des résultats ONVIF");
  return res.json();
}

// ─── Detection Zones ───

export interface DetectionZone {
  id: string;
  cameraId: string;
  name: string;
  type: 'rectangle' | 'polygon';
  coordinates: number[][];
  isActive: boolean;
  sensitivity?: number;
  createdAt: string;
  updatedAt: string;
}

export async function getZones(cameraId: string): Promise<DetectionZone[]> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/zones`);
  if (!res.ok) throw new Error("Échec du chargement des zones");
  return res.json();
}

export async function createZone(cameraId: string, data: {
  name: string;
  type: 'rectangle' | 'polygon';
  coordinates: number[][];
  isActive?: boolean;
}): Promise<DetectionZone> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/zones`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de la création de la zone");
  }
  return res.json();
}

export async function updateZone(id: string, data: {
  name?: string;
  coordinates?: number[][];
  isActive?: boolean;
  sensitivity?: number;
}): Promise<DetectionZone> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/zones/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour de la zone");
  return res.json();
}

export async function deleteZone(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/zones/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Échec de la suppression de la zone");
}

export async function updateSensitivity(cameraId: string, confidence: number): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/sensitivity`, {
    method: "PATCH",
    body: JSON.stringify({ confidence }),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour de la sensibilité");
}

export async function getDetectionConfig(cameraId: string): Promise<{ sensitivity: number; zones: DetectionZone[] }> {

// ─── BASTION Multi-site Types ───

export interface Site {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string;
  isActive: boolean;
  parentOrganizationId?: string | null;
  maxSites: number;
  createdAt: string;
  updatedAt: string;
  _count?: { cameras: number; doors: number; members: number };
  cameras?: Camera[];
}

export interface AggregateStats {
  totalCameras: number;
  onlineCameras: number;
  totalAlerts: number;
  criticalAlerts: number;
  storageUsed: number;
  storageTotal: number;
  uptimePercent: number;
  sites: { id: string; name: string; status: "online" | "offline" | "degraded"; cameraCount: number; alertCount: number }[];
}

export interface SiteStats {
  cameras: { total: number; online: number; offline: number };
  alerts: { total: number; open: number; critical: number };
  storage: { used: number; total: number; percentUsed: number };
  uptime: { percent: number; uptimeHours: number; totalHours: number };
  doors: { total: number; online: number };
  members: number;
}

export interface ComparisonData {
  sites: Array<{
    id: string;
    name: string;
    cameras: number;
    alerts: number;
    storageUsed: number;
    uptimePercent: number;
    alertTrend: number[];
    status: "online" | "offline" | "degraded";
  }>;
  period: "today" | "7d" | "30d";
}

export interface SearchResults {
  events: Array<{ id: string; title: string; siteName: string; severity: string; timestamp: string; url: string }>;
  people: Array<{ id: string; name: string; siteName: string; type: "face" | "user" | "visitor"; url: string }>;
  credentials: Array<{ id: string; label: string; siteName: string; type: string; url: string }>;
}

export interface BastionFaceEntry {
  id: string;
  name: string;
  photoBase64: string;
  isBlacklisted: boolean;
  riskThreshold: number | null;
  createdAt: string;
  updatedAt: string;
  _count?: { passages: number };
}

export interface BastionFaceDetail extends BastionFaceEntry {
  passages: FacePassage[];
  riskThreshold: number;
}

export interface FacePassage {
  id: string;
  faceId: string;
  cameraId: string;
  riskScore: number | null;
  livenessScore: number | null;
  snapshotUrl: string | null;
  matched: boolean;
  createdAt: string;
  camera?: { id: string; name: string };
}

export interface AccessGroup {
  id: string;
  name: string;
  organizationId: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number };
}

export interface AccessEvent {
  id: string;
  credentialId?: string;
  doorId: string;
  decision: "granted" | "denied";
  reason?: string;
  snapshotUrl?: string;
  videoClipUrl?: string;
  timestamp: string;
  user?: { id: string; firstName: string; lastName: string };
  door?: { id: string; name: string };
  credential?: { id: string; type: string; badgeNumber?: string };
}

export interface AccessEventDetail extends AccessEvent {
  correlation?: { cameraId: string; snapshotUrl?: string; clipUrl?: string };
  riskScore?: number;
  livenessScore?: number;
}

export interface CredentialCreateInput {
  userId: string;
  type: "BADGE" | "PIN" | "MOBILE" | "QR" | "FINGERPRINT" | "FACE";
  badgeNumber?: string;
  pinHash?: string;
  qrSeed?: string;
  fingerprintTemplateHash?: string;
  faceEmbeddingId?: string;
  validFrom?: string;
  validUntil?: string;
  maxUses?: number;
}

export interface RoleDefinition {
  name: string;
  level: number;
  memberCount: number;
  permissions: string[];
  isCustom: boolean;
}

export interface SsoProvider {
  id: string;
  name: string;
  type: "saml" | "oidc";
  issuerUrl?: string;
  entryPoint?: string;
  certificate?: string | null;
  clientId?: string;
  clientSecret?: string | null;
  attributeMappings?: Record<string, string>;
  autoProvisioning: boolean;
  ssoEnforced: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface SsoProviderConfig {
  name: string;
  type: "saml" | "oidc";
  issuerUrl?: string;
  entryPoint?: string;
  metadataUrl?: string;
  certificate?: string;
  clientId?: string;
  clientSecret?: string;
  attributeMappings?: Record<string, string>;
  autoProvisioning?: boolean;
  ssoEnforced?: boolean;
}

export interface SyncStatus {
  lastSyncAt?: string;
  status: "synced" | "pending" | "error";
  sites: Array<{ id: string; name: string; status: "synced" | "pending" | "error"; lastSyncAt?: string; error?: string }>;
}

// ─── BASTION Multi-site API Functions ───

export async function getSites(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Site>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const res = await fetchWithAuth(`${API_URL}/api/sites?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des sites");
  return res.json();
}

export async function getSite(id: string): Promise<Site> {
  const res = await fetchWithAuth(`${API_URL}/api/sites/${id}`);
  if (!res.ok) throw new Error("Échec du chargement du site");
  return res.json();
}

export async function createSite(data: { name: string; address?: string; city?: string; country?: string }): Promise<Site> {
  const res = await fetchWithAuth(`${API_URL}/api/sites`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de création du site");
  }
  return res.json();
}

export async function updateSite(id: string, data: Partial<Site>): Promise<Site> {
  const res = await fetchWithAuth(`${API_URL}/api/sites/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour du site");
  return res.json();
}

export async function deleteSite(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/sites/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Échec de la suppression du site");
}

export async function getAggregateStats(): Promise<AggregateStats> {
  const res = await fetchWithAuth(`${API_URL}/api/sites/aggregate`);
  if (!res.ok) throw new Error("Échec du chargement des statistiques agrégées");
  return res.json();
}

export async function getSiteStats(id: string): Promise<SiteStats> {
  const res = await fetchWithAuth(`${API_URL}/api/sites/${id}/stats`);
  if (!res.ok) throw new Error("Échec du chargement des statistiques du site");
  return res.json();
}

export async function getComparisonData(period?: string): Promise<ComparisonData> {
  const params = period ? `?period=${period}` : "";
  const res = await fetchWithAuth(`${API_URL}/api/sites/comparison${params}`);
  if (!res.ok) throw new Error("Échec du chargement des données de comparaison");
  return res.json();
}

export async function globalSearch(query: string, type?: string): Promise<SearchResults> {
  const searchParams = new URLSearchParams({ q: query });
  if (type) searchParams.set("type", type);
  const res = await fetchWithAuth(`${API_URL}/api/sites/search?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec de la recherche globale");
  return res.json();
}

// ─── BASTION Face API Functions ───

export async function getBastionFaces(params?: { page?: number; limit?: number; search?: string; blacklisted?: boolean }): Promise<PaginatedResponse<BastionFaceEntry>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.blacklisted !== undefined) searchParams.set("blacklisted", String(params.blacklisted));
  const res = await fetchWithAuth(`${API_URL}/api/bastion/faces?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des visages");
  return res.json();
}

export async function enrollBastionFace(data: { name: string; photoBase64: string; isBlacklisted?: boolean; riskThreshold?: number }): Promise<BastionFaceEntry> {
  const res = await fetchWithAuth(`${API_URL}/api/bastion/faces`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'ajout du visage");
  }
  return res.json();
}

export async function getBastionFace(id: string): Promise<BastionFaceDetail> {
  const res = await fetchWithAuth(`${API_URL}/api/bastion/faces/${id}`);
  if (!res.ok) throw new Error("Échec du chargement du visage");
  return res.json();
}

export async function updateBastionFace(id: string, data: Partial<BastionFaceEntry>): Promise<BastionFaceEntry> {
  const res = await fetchWithAuth(`${API_URL}/api/bastion/faces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour du visage");
  return res.json();
}

export async function deleteBastionFace(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/bastion/faces/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Échec de la suppression du visage");
}

export async function toggleBlacklist(id: string): Promise<BastionFaceEntry> {
  const res = await fetchWithAuth(`${API_URL}/api/bastion/faces/${id}/toggle-blacklist`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Échec du basculement de la liste noire");
  return res.json();
}

export async function getFacePassages(id: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<FacePassage>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const res = await fetchWithAuth(`${API_URL}/api/bastion/faces/${id}/passages?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des passages");
  return res.json();
}

export async function getRecentPassages(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<FacePassage>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const res = await fetchWithAuth(`${API_URL}/api/bastion/passages?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des passages récents");
  return res.json();
}

// ─── BASTION Access Control API Functions ───

export async function createCredentialV2(data: CredentialCreateInput): Promise<CredentialDto> {
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

export async function getAccessGroups(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<AccessGroup>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  const res = await fetchWithAuth(`${API_URL}/api/access/groups?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des groupes");
  return res.json();
}

export async function createAccessGroup(data: { name: string; description?: string }): Promise<AccessGroup> {
  const res = await fetchWithAuth(`${API_URL}/api/access/groups`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de création du groupe");
  }
  return res.json();
}

export async function updateAccessGroup(id: string, data: Partial<AccessGroup>): Promise<AccessGroup> {
  const res = await fetchWithAuth(`${API_URL}/api/access/groups/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour du groupe");
  return res.json();
}

export async function deleteAccessGroup(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/access/groups/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Échec de la suppression du groupe");
}

export async function addMemberToGroup(groupId: string, memberId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/access/groups/${groupId}/members/${memberId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Échec de l'ajout du membre");
}

export async function removeMemberFromGroup(groupId: string, memberId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/access/groups/${groupId}/members/${memberId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Échec du retrait du membre");
}

export async function createAccessSchedule(data: { name: string; entries: ScheduleEntry[] }): Promise<ScheduleDto> {
  const res = await fetchWithAuth(`${API_URL}/api/access/schedules`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de création de l'horaire");
  }
  return res.json();
}

export async function getAccessSchedules(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<ScheduleDto>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const res = await fetchWithAuth(`${API_URL}/api/access/schedules?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des horaires");
  return res.json();
}

export async function getAccessEvents(params?: { page?: number; limit?: number; type?: string; from?: string; to?: string }): Promise<PaginatedResponse<AccessEvent>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.type) searchParams.set("type", params.type);
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  const res = await fetchWithAuth(`${API_URL}/api/access/events?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des événements");
  return res.json();
}

export async function getAccessEvent(id: string): Promise<AccessEventDetail> {
  const res = await fetchWithAuth(`${API_URL}/api/access/events/${id}`);
  if (!res.ok) throw new Error("Échec du chargement de l'événement");
  return res.json();
}

// ─── BASTION RBAC, SSO, Sync API Functions ───

export async function getRoles(): Promise<RoleDefinition[]> {
  const res = await fetchWithAuth(`${API_URL}/api/parametres/rbac/roles`);
  if (!res.ok) throw new Error("Échec du chargement des rôles");
  return res.json();
}

export async function updateRole(roleName: string, permissions: string[]): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/parametres/rbac/roles/${encodeURIComponent(roleName)}`, {
    method: "PATCH",
    body: JSON.stringify({ permissions }),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour du rôle");
}

export async function createCustomRole(data: { name: string; permissions: string[]; parentRole: string }): Promise<RoleDefinition> {
  const res = await fetchWithAuth(`${API_URL}/api/parametres/rbac/roles`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de création du rôle");
  }
  return res.json();
}

export async function getSsoProviders(): Promise<SsoProvider[]> {
  const res = await fetchWithAuth(`${API_URL}/api/parametres/sso`);
  if (!res.ok) throw new Error("Échec du chargement des fournisseurs SSO");
  return res.json();
}

export async function createSsoProvider(data: SsoProviderConfig): Promise<SsoProvider> {
  const res = await fetchWithAuth(`${API_URL}/api/parametres/sso`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de création du fournisseur SSO");
  }
  return res.json();
}

export async function updateSsoProvider(id: string, data: Partial<SsoProviderConfig>): Promise<SsoProvider> {
  const res = await fetchWithAuth(`${API_URL}/api/parametres/sso/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour du fournisseur SSO");
  return res.json();
}

export async function deleteSsoProvider(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/parametres/sso/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Échec de la suppression du fournisseur SSO");
}

export async function testSsoConnection(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/parametres/sso/${id}/test`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    return { success: false, message: errData.message || "Échec de connexion au fournisseur SSO" };
  }
  return res.json();
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const res = await fetchWithAuth(`${API_URL}/api/parametres/synchronisation`);
  if (!res.ok) throw new Error("Échec du chargement du statut de synchronisation");
  return res.json();
}

export async function triggerSync(): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/parametres/synchronisation/trigger`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Échec du déclenchement de la synchronisation");
}
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/detection-config`);
  if (!res.ok) throw new Error("Échec du chargement de la configuration de détection");
  return res.json();
}

// ─── Face Recognition ───

export interface FaceEntry {
  id: string;
  organizationId: string;
  name: string;
  photoBase64: string;
  status: 'recognized' | 'unknown' | 'pending' | 'error';
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getFaces(): Promise<FaceEntry[]> {
  const res = await fetchWithAuth(`${API_URL}/api/faces`);
  if (!res.ok) throw new Error("Échec du chargement des visages");
  return res.json();
}

export async function addFace(data: {
  name: string;
  photoBase64: string;
}): Promise<FaceEntry> {
  const res = await fetchWithAuth(`${API_URL}/api/faces`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'ajout du visage");
  }
  return res.json();
}

export async function deleteFace(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/faces/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Échec de la suppression du visage");
}

export async function updateFace(id: string, data: {
  name?: string;
  photoBase64?: string;
}): Promise<FaceEntry> {
  const res = await fetchWithAuth(`${API_URL}/api/faces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour du visage");
  return res.json();
}

// ─── VISION Event / Clip Export Types ───

export interface EventSearchParams {
  organizationId: string;
  from?: string;
  to?: string;
  eventType?: string;
  cameraId?: string;
  page?: number;
  limit?: number;
}

export interface VisionEventDto {
  id: string;
  eventType: "alert" | "motion" | "face" | "system";
  cameraId: string;
  cameraName: string;
  title: string;
  severity: string;
  timestamp: string;
  snapshotUrl?: string;
  thumbnailUrl?: string;
}

export interface ClipExportResult {
  downloadUrl: string;
  expiresAt: string;
}

// ─── Event Timeline / Clip API Functions ───

export async function searchEvents(
  params: EventSearchParams,
): Promise<{ data: VisionEventDto[]; total: number; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set("organizationId", params.organizationId);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.eventType) searchParams.set("eventType", params.eventType);
  if (params.cameraId) searchParams.set("cameraId", params.cameraId);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const res = await fetchWithAuth(`${API_URL}/api/events?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des événements");
  return res.json();
}

export async function exportClip(eventId: string): Promise<ClipExportResult> {
  const res = await fetchWithAuth(`${API_URL}/api/events/${eventId}/export`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Échec de l'export du clip");
  return res.json();
}

export async function getEventDetail(eventId: string): Promise<VisionEventDto> {
  const res = await fetchWithAuth(`${API_URL}/api/events/${eventId}`);
  if (!res.ok) throw new Error("Échec du chargement des détails de l'événement");
  return res.json();
}

// ─── Recording Config Types & API ───

export interface RecordingConfig {
  retentionDays: number;
  codec: "H264" | "H265";
  storagePath: string;
  storageUsedGb: number;
  storageTotalGb: number;
}

export async function getRecordingConfig(): Promise<RecordingConfig> {
  const res = await fetchWithAuth(`${API_URL}/api/recording/config`);
  if (!res.ok) throw new Error("Échec du chargement de la configuration d'enregistrement");
  return res.json();
}

export async function updateRecordingConfig(data: Partial<RecordingConfig>): Promise<RecordingConfig> {
  const res = await fetchWithAuth(`${API_URL}/api/recording/config`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour de la configuration d'enregistrement");
  return res.json();
}

// ─── Stream Share Types & API ───

export interface ShareLink {
  id: string;
  cameraIds: string[];
  cameras?: { name: string }[];
  durationMinutes: number;
  link: string;
  status: "active" | "expired" | "revoked";
  expiresAt: string;
  createdAt: string;
}

export async function getShares(): Promise<ShareLink[]> {
  const res = await fetchWithAuth(`${API_URL}/api/shares`);
  if (!res.ok) throw new Error("Échec du chargement des partages");
  return res.json();
}

export async function createShare(data: {
  cameraIds: string[];
  durationMinutes: number;
}): Promise<ShareLink> {
  const res = await fetchWithAuth(`${API_URL}/api/shares`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la création du lien de partage");
  return res.json();
}

export async function revokeShare(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/shares/${id}/revoke`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Échec de la révocation du partage");
}

// ─── Geofencing Types & API ───

export interface GeofencingStatus {
  armed: boolean;
  connectedPhones: number;
  armDelayMinutes: number;
  timeoutMinutes: number;
  lastChangeAt?: string;
  manualOverride: boolean;
}

export interface GeofencingConfig {
  trustedSsids: string[];
  armDelayMinutes: number;
  timeoutMinutes: number;
  reinforcedSensitivity: boolean;
  scheduleEnabled: boolean;
  scheduleDays: number[];
  scheduleStart?: string;
  scheduleEnd?: string;
  lastChangeAt?: string;
}

export async function getGeofencingStatus(): Promise<GeofencingStatus> {
  const res = await fetchWithAuth(`${API_URL}/api/geofencing/status`);
  if (!res.ok) {
    // Return default if not implemented yet
    return { armed: false, connectedPhones: 0, armDelayMinutes: 10, timeoutMinutes: 15, manualOverride: false };
  }
  return res.json();
}

export async function getGeofencingConfig(): Promise<GeofencingConfig> {
  const res = await fetchWithAuth(`${API_URL}/api/geofencing/config`);
  if (!res.ok) throw new Error("Échec du chargement de la configuration de géolocalisation");
  return res.json();
}

export async function updateGeofencingConfig(data: Partial<GeofencingConfig>): Promise<GeofencingConfig> {
  const res = await fetchWithAuth(`${API_URL}/api/geofencing/config`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour de la configuration");
  return res.json();
}

export async function forceArm(): Promise<void> {
  await fetchWithAuth(`${API_URL}/api/geofencing/arm`, { method: "POST" });
}

export async function forceDisarm(): Promise<void> {
  await fetchWithAuth(`${API_URL}/api/geofencing/disarm`, { method: "POST" });
}

// ─── DND Schedule Types & API ───

export interface DndEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface DndConfig {
  enabled: boolean;
  sameForAllDays: boolean;
  schedule: DndEntry[];
  criticalOverride: boolean;
}

export async function getDndSchedule(): Promise<DndConfig> {
  const res = await fetchWithAuth(`${API_URL}/api/dnd/schedule`);
  if (!res.ok) throw new Error("Échec du chargement du planning DND");
  return res.json();
}

export async function updateDndSchedule(data: Partial<DndConfig>): Promise<DndConfig> {
  const res = await fetchWithAuth(`${API_URL}/api/dnd/schedule`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour du planning DND");
  return res.json();
}

// ─── Alert Channel Types & API ───

export interface AlertChannelConfig {
  pushEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  modemConnected: boolean;
  modemPhoneNumber?: string;
  whatsappConnected: boolean;
  whatsappDeviceName?: string;
  whatsappQrCodeUrl?: string;
  cloudFallbackEnabled: boolean;
  alertTypes: ("motion" | "face" | "all")[];
}

export async function getAlertChannelConfig(): Promise<AlertChannelConfig> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/channels`);
  if (!res.ok) throw new Error("Échec du chargement de la configuration des canaux d'alerte");
  return res.json();
}

export async function updateAlertChannelConfig(data: Partial<AlertChannelConfig>): Promise<AlertChannelConfig> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/channels`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour des canaux d'alerte");
  return res.json();
}

export async function getHermesStatus(): Promise<{ connected: boolean; uptime?: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/hermes/status`);
  if (!res.ok) return { connected: false };
  return res.json();
}

export async function getModemStatus(): Promise<{ connected: boolean; phoneNumber?: string; signal?: number }> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/modem/status`);
  if (!res.ok) return { connected: false };
  return res.json();
}

export async function sendTestWhatsApp(): Promise<{ success: boolean }> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/whatsapp/test`, { method: "POST" });
  if (!res.ok) throw new Error("Échec de l'envoi du test WhatsApp");
  return res.json();
}

export async function sendTestSms(): Promise<{ success: boolean }> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/sms/test`, { method: "POST" });
  if (!res.ok) throw new Error("Échec de l'envoi du test SMS");
  return res.json();
}

export async function getWhatsAppQrCode(): Promise<{ qrCodeUrl: string }> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/whatsapp/qr`);
  if (!res.ok) throw new Error("Échec du chargement du QR code WhatsApp");
  return res.json();
}

// ─── Invite via SMS ───

export async function inviteBySms(orgId: string, data: { phone: string; role: string }): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/organizations/${orgId}/invites/sms`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de l'invitation par SMS");
  return res.json();
}