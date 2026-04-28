import { fetchWithAuth } from "@/lib/auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// --- Types ---

export interface Camera {
  id: string;
  name: string;
  rtspUrl: string;
  status: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "DEGRADED";
  siteId: string;
  resolution: string | null;
  fps: number;
  isRecording: boolean;
  lastHeartbeat: string | null;
  createdAt: string;
  updatedAt: string;
  site?: Site;
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
