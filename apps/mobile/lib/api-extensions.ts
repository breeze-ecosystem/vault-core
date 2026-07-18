import { fetchWithAuth } from "@/lib/auth-client";
import { API_URL as API_BASE } from "@/lib/config";

// ─── Camera Streams (Task 1) ───

export interface CameraWithStream {
  id: string;
  name: string;
  status: string;
  streamUrl: string;
  substreamUrl?: string;
  isRecording: boolean;
  resolution: string | null;
  fps: number;
}

export async function getCamerasWithStreams(): Promise<CameraWithStream[]> {
  const res = await fetchWithAuth(`${API_BASE}/cameras?includeStreams=true`);
  if (!res.ok) throw new Error("Impossible de charger les caméras");
  const data = await res.json();
  return data.data || data;
}

export function getCameraStreamUrl(cameraId: string, quality: "HD" | "SD" = "HD"): string {
  // Uses stream URL from config, constructs RTSP/HLS path based on camera ID
  const streamBase = process.env.EXPO_PUBLIC_STREAM_URL || "http://localhost:8080";
  return `${streamBase}/stream/${cameraId}${quality === "SD" ? "/sub" : ""}.m3u8`;
}

export async function takeSnapshot(cameraId: string): Promise<{ image: string }> {
  const res = await fetchWithAuth(`${API_BASE}/ingestion/${cameraId}/snapshot`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Impossible de capturer l'image");
  return res.json();
}

// ─── Event Timeline (Task 2) ───

export interface TimelineEvent {
  id: string;
  eventType: string;
  cameraId: string;
  cameraName: string;
  timestamp: string;
  snapshotUrl: string | null;
  clipUrl: string | null;
  severity: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
}

export interface TimelineSearchParams {
  from?: string;
  to?: string;
  eventType?: string;
  cameraId?: string;
  severity?: string;
  page?: number;
  limit?: number;
}

export async function searchEvents(
  params?: TimelineSearchParams,
): Promise<{ data: TimelineEvent[]; total: number }> {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.eventType) search.set("eventType", params.eventType);
  if (params?.cameraId) search.set("cameraId", params.cameraId);
  if (params?.severity) search.set("severity", params.severity);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/timeline/events${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des événements");
  return res.json();
}

export async function exportClip(eventId: string): Promise<{ downloadUrl: string }> {
  const res = await fetchWithAuth(`${API_BASE}/timeline/events/${eventId}/export`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Impossible d'exporter le clip");
  return res.json();
}

// ─── Face Management (Task 2) ───

export interface FaceData {
  id: string;
  name: string;
  imageUrl: string;
  status: "recognized" | "pending" | "error";
  lastSeen: string | null;
  createdAt: string;
}

export async function getFaces(params?: {
  page?: number;
  limit?: number;
}): Promise<{ data: FaceData[]; total: number }> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const res = await fetchWithAuth(`${API_BASE}/faces${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des visages");
  return res.json();
}

export async function addFace(data: {
  name: string;
  imageUri: string;
}): Promise<FaceData> {
  const formData = new FormData();
  const filename = data.imageUri.split("/").pop() || "face.jpg";
  formData.append("file", {
    uri: data.imageUri,
    name: filename,
    type: "image/jpeg",
  } as any);
  formData.append("name", data.name);

  const res = await fetchWithAuth(`${API_BASE}/faces`, {
    method: "POST",
    body: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Erreur lors de l'ajout du visage");
  }
  return res.json();
}

export async function deleteFace(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/faces/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur lors de la suppression du visage");
}

// ─── Alerts (Task 2) ───

export async function acknowledgeAlert(alertId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/alerts/${alertId}/acknowledge`, {
    method: "PATCH",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Impossible de prendre en compte l'alerte");
  }
}

// ─── Geofencing & Arm/Disarm (Task 3) ───

export interface GeofencingStatus {
  armed: boolean;
  connectedPhones: number;
  trustedSsids: string[];
  currentSsid: string | null;
  armDelay: number;
  timeout: number;
  lastStatusChange: string | null;
  armingCountdown: number | null;
}

export async function getGeofencingStatus(): Promise<GeofencingStatus> {
  const res = await fetchWithAuth(`${API_BASE}/geofencing/status`);
  if (!res.ok) throw new Error("Impossible de charger le statut de géofencing");
  return res.json();
}

export async function postHeartbeat(ssid: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/geofencing/heartbeat`, {
    method: "POST",
    body: JSON.stringify({ ssid }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Impossible d'envoyer le signal");
  }
}

export async function postDisconnected(): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/geofencing/disconnected`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Impossible de signaler la déconnexion");
  }
}

export async function forceArm(): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/geofencing/arm`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Impossible d'armer le système");
  }
}

export async function forceDisarm(): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/geofencing/disarm`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Impossible de désarmer le système");
  }
}

// ─── Share Link (Task 3) ───

export interface ShareTokenInfo {
  valid: boolean;
  streamUrl: string;
  expiresAt: string;
  ownerName: string;
  cameraName: string;
}

export async function getShareTokenInfo(token: string): Promise<ShareTokenInfo> {
  const res = await fetch(`${API_BASE}/stream/share/${token}`);
  if (!res.ok) {
    if (res.status === 404 || res.status === 410) {
      return { valid: false, streamUrl: "", expiresAt: "", ownerName: "", cameraName: "" };
    }
    throw new Error("Impossible de vérifier le lien de partage");
  }
  return res.json();
}

export async function verifyShareToken(token: string): Promise<boolean> {
  try {
    const info = await getShareTokenInfo(token);
    return info.valid;
  } catch {
    return false;
  }
}
