import { fetchWithAuth } from "@/lib/auth-client";

const API_URL = "http://localhost:4000";

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

export interface AlertItem {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  cameraId: string;
  createdAt: string;
  camera?: { id: string; name: string };
}

export interface CameraItem {
  id: string;
  name: string;
  status: string;
  siteId: string;
  resolution: string | null;
  isRecording: boolean;
  site?: { id: string; name: string };
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetchWithAuth(`${API_URL}/api/dashboard/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchAlerts(limit = 20): Promise<{ data: AlertItem[]; total: number }> {
  const res = await fetchWithAuth(`${API_URL}/api/alerts?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function fetchCameras(): Promise<{ data: CameraItem[]; total: number }> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras`);
  if (!res.ok) throw new Error("Failed to fetch cameras");
  return res.json();
}
