import { fetchWithAuth } from "@/lib/auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://oversight-api.digitsoftafrica.com";

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

export async function updateUser(id: string, data: { firstName?: string; lastName?: string; role?: string; isActive?: boolean }): Promise<DashboardUser> {
  const res = await fetchWithAuth(`${API_URL}/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update user");
  return res.json();
}
