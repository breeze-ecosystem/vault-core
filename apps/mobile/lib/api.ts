import { fetchWithAuth } from "@/lib/auth-client";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://oversight-api.digitsoftafrica.com";

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

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetchWithAuth(`${API_URL}/api/dashboard/stats`);
  if (!res.ok) throw new Error("Impossible de charger les statistiques");
  return res.json();
}

export async function fetchAlerts(limit = 20): Promise<{ data: AlertItem[]; total: number }> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts?limit=${limit}`);
  if (!res.ok) throw new Error("Impossible de charger les alertes");
  return res.json();
}

export async function fetchAlertById(id: string): Promise<AlertDetail> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/${id}`);
  if (!res.ok) throw new Error("Impossible de charger les details de l'alerte");
  return res.json();
}

export async function fetchCameras(): Promise<{ data: CameraItem[]; total: number }> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras`);
  if (!res.ok) throw new Error("Impossible de charger les cameras");
  return res.json();
}

export async function fetchCameraById(id: string): Promise<CameraItem> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${id}`);
  if (!res.ok) throw new Error("Impossible de charger la camera");
  return res.json();
}

export async function fetchCameraAlerts(cameraId: string, limit = 10): Promise<{ data: AlertItem[]; total: number }> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts?cameraId=${encodeURIComponent(cameraId)}&limit=${limit}`);
  if (!res.ok) throw new Error("Impossible de charger les alertes de la camera");
  return res.json();
}

export async function fetchSites(): Promise<{ data: SiteItem[]; total: number }> {
  const res = await fetchWithAuth(`${API_URL}/api/sites?limit=100`);
  if (!res.ok) throw new Error("Impossible de charger les sites");
  return res.json();
}

export async function acknowledgeAlert(id: string): Promise<AlertDetail> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/${id}/acknowledge`, { method: "PATCH" });
  if (!res.ok) throw new Error("Impossible de prendre en compte l'alerte");
  return res.json();
}

export async function resolveAlert(id: string): Promise<AlertDetail> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/${id}/resolve`, { method: "PATCH" });
  if (!res.ok) throw new Error("Impossible de resoudre l'alerte");
  return res.json();
}

export async function markAlertFalsePositive(id: string): Promise<AlertDetail> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/${id}/false-positive`, { method: "PATCH" });
  if (!res.ok) throw new Error("Impossible de marquer comme faux positif");
  return res.json();
}

export async function deleteAlert(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Impossible de supprimer l'alerte");
}
