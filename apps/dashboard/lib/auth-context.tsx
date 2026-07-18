"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getUser, getAccessToken, getOrganization, refreshTokens, logout as authLogout, switchOrganization as authSwitchOrg } from "@/lib/auth-client";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
}

interface Organization {
  id: string;
  name?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  organization: Organization | null;
  organizations: Array<{ id: string; name: string; role: string }>;
  switchOrganization: (orgId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  organization: null,
  organizations: [],
  switchOrganization: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const stored = getUser();
      const org = getOrganization();
      if (stored) {
        setUser({ ...stored, role: org?.role ?? stored.role ?? "", organizationId: org?.id ?? "" });
        if (org) setOrganization(org as Organization);
        setIsLoading(false);
        return;
      }

      const token = getAccessToken();
      if (token) {
        const refreshed = await refreshTokens();
        if (refreshed?.user) {
          const merged = { ...refreshed.user, role: refreshed.organization?.role ?? "", organizationId: refreshed.organization?.id ?? "" };
          setUser(merged);
          if (refreshed.organization) {
            setOrganization(refreshed.organization as Organization);
          }
        }
      }
      setIsLoading(false);
    }
    init();
  }, []);

  const switchOrganization = useCallback(async (orgId: string) => {
    const result = await authSwitchOrg(orgId);
    if (result.user) {
      setUser({ ...result.user, role: result.organization?.role ?? "", organizationId: result.organization?.id ?? "" } as User);
      if (result.organization) {
        setOrganization(result.organization as Organization);
      }
      window.location.href = "/";
    }
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
    setOrganization(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        organizations,
        switchOrganization,
        isLoading,
        isAuthenticated: !!user,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
