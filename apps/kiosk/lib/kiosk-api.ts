const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
const KIOSK_ID = process.env.NEXT_PUBLIC_KIOSK_ID || "kiosk-01";

export class KioskApiError extends Error {
  constructor(
    message: string,
    public code:
      | "NETWORK"
      | "NOT_FOUND"
      | "PRINTER_ERROR"
      | "ALREADY_CHECKED_IN"
      | "ALREADY_CHECKED_OUT"
      | "VISIT_EXPIRED"
      | "UNAUTHORIZED"
      | "UNKNOWN",
  ) {
    super(message);
    this.name = "KioskApiError";
  }
}

async function kioskFetch(path: string, options?: RequestInit): Promise<any> {
  const url = `${API_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
        "X-Kiosk-Id": KIOSK_ID,
        ...options?.headers,
      },
    });
  } catch {
    throw new KioskApiError(
      "Network error — cannot reach server",
      "NETWORK",
    );
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new KioskApiError("Unauthorized", "UNAUTHORIZED");
    }
    if (res.status === 404) {
      throw new KioskApiError("Not found", "NOT_FOUND");
    }
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      const msg = (body.message || "").toLowerCase();
      if (msg.includes("already checked in")) {
        throw new KioskApiError("Already checked in", "ALREADY_CHECKED_IN");
      }
      if (msg.includes("already checked out")) {
        throw new KioskApiError("Already checked out", "ALREADY_CHECKED_OUT");
      }
      if (msg.includes("expired")) {
        throw new KioskApiError("Visit expired", "VISIT_EXPIRED");
      }
    }
    if (res.status === 503) {
      throw new KioskApiError("Printer unavailable", "PRINTER_ERROR");
    }
    throw new KioskApiError(`HTTP ${res.status}`, "UNKNOWN");
  }

  // Handle 204 No Content (common for POST operations)
  if (res.status === 204) return undefined;

  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

export async function searchVisits(query: string) {
  return kioskFetch(
    `/kiosk/search?name=${encodeURIComponent(query)}`,
  );
}

export async function getVisit(visitId: string) {
  return kioskFetch(`/kiosk/visits/${visitId}`);
}

export async function checkIn(visitId: string) {
  return kioskFetch(`/kiosk/check-in/${visitId}`, { method: "POST" });
}

export async function checkOut(visitId: string) {
  return kioskFetch(`/kiosk/check-out/${visitId}`, { method: "POST" });
}

export async function printBadge(visitId: string) {
  return kioskFetch(`/kiosk/print/${visitId}`, { method: "POST" });
}
