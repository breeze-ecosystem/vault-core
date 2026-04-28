import {
  saveTokens,
  saveUser,
  getAccessTokenAsync,
  getRefreshTokenAsync,
  clearAuth,
} from "./auth-storage";

const API_URL = "http://localhost:4000";

interface AuthResult {
  accessToken?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  error?: string;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.message || "Login failed" };
    }

    await saveTokens(data.accessToken, data.refreshToken);
    await saveUser(data.user);

    return { accessToken: data.accessToken, user: data.user };
  } catch {
    return { error: "Cannot reach server" };
  }
}

export async function refreshTokens(): Promise<AuthResult | null> {
  const refreshToken = await getRefreshTokenAsync();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      await clearAuth();
      return null;
    }

    const data = await res.json();
    await saveTokens(data.accessToken, data.refreshToken);
    await saveUser(data.user);

    return { accessToken: data.accessToken, user: data.user };
  } catch {
    return null;
  }
}

export async function logout() {
  const token = await getAccessTokenAsync();
  const refreshToken = await getRefreshTokenAsync();

  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // ignore
  }

  await clearAuth();
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getAccessTokenAsync();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (refreshed?.accessToken) {
      headers["Authorization"] = `Bearer ${refreshed.accessToken}`;
      res = await fetch(url, { ...options, headers });
    }
  }

  return res;
}
