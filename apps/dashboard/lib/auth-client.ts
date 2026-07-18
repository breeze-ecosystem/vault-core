if (!process.env.NEXT_PUBLIC_API_URL) {
  console.error("NEXT_PUBLIC_API_URL is not defined. Set it in .env or .env.local");
}
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface AuthResult {
  accessToken?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  organization?: {
    id: string;
    name?: string;
    role?: string;
  };
  error?: string;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.message || "Échec de connexion" };
    }

    // Store access token in memory / sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.setItem("accessToken", data.accessToken);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      if (data.organization) {
        sessionStorage.setItem("organization", JSON.stringify(data.organization));
      }
    }

    return { accessToken: data.accessToken, user: data.user, organization: data.organization };
  } catch {
    return { error: "Serveur inaccessible" };
  }
}

export async function refreshTokens(): Promise<AuthResult | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!res.ok) return null;

    const data = await res.json();

    if (typeof window !== "undefined") {
      sessionStorage.setItem("accessToken", data.accessToken);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      if (data.organization) {
        sessionStorage.setItem("organization", JSON.stringify(data.organization));
      }
    }

    return { accessToken: data.accessToken, user: data.user, organization: data.organization };
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  const token = getAccessToken();
  await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (typeof window !== "undefined") {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("organization");
  }
}

export function getOrganization() {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("organization");
  return raw ? JSON.parse(raw) : null;
}

export async function switchOrganization(orgId: string): Promise<AuthResult> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/api/auth/switch-org`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
    body: JSON.stringify({ organizationId: orgId }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.message || "Échec du changement d'organisation" };
  if (typeof window !== "undefined") {
    sessionStorage.setItem("accessToken", data.accessToken);
    sessionStorage.setItem("user", JSON.stringify(data.user));
    sessionStorage.setItem("organization", JSON.stringify(data.organization));
  }
  return { accessToken: data.accessToken, user: data.user, organization: data.organization };
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("accessToken");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Public route prefixes that should NOT redirect to login on 401.
 * These are endpoints accessible without authentication:
 * - Subject access portal (BAS-34): /api/compliance/subject-access/*
 * - Fire alarm/BMS incoming webhooks: /api/integrations/fire-alarm, /api/integrations/bms
 */
export const PUBLIC_ROUTE_PREFIXES = [
  "/api/compliance/subject-access/",
  "/api/integrations/fire-alarm",
  "/api/integrations/bms",
];

/**
 * Check if a URL matches any public route prefix.
 */
function isPublicRoute(url: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => url.includes(prefix));
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type when there's a body (POST, PUT, PATCH)
  if (options.body || ["POST", "PUT", "PATCH"].includes((options.method ?? "").toUpperCase())) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(url, { ...options, headers, credentials: "include" });

  // For public routes, skip 401 redirect to /login
  // The API handles these endpoints without JWT auth (@Public() decorator)
  if (res.status === 401) {
    if (isPublicRoute(url)) {
      return res;
    }
    const refreshed = await refreshTokens();
    if (refreshed?.accessToken) {
      headers["Authorization"] = `Bearer ${refreshed.accessToken}`;
      res = await fetch(url, { ...options, headers, credentials: "include" });
    } else {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  return res;
}
