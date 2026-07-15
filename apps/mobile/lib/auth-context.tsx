import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  getUserAsync,
  getAccessTokenAsync,
} from "@/lib/auth-storage";
import { login as apiLogin, refreshTokens, logout as apiLogout, isTokenExpired, switchOrganization as apiSwitchOrg } from "@/lib/auth-client";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Organization {
  id: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  organization: Organization | null;
  organizations: Array<{ id: string; name: string; role: string }>;
  switchOrganization: (orgId: string) => Promise<void>;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  organization: null,
  organizations: [],
  switchOrganization: async () => {},
  login: async () => ({}),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const token = await getAccessTokenAsync();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const storedUser = await getUserAsync();
        const expired = isTokenExpired(token);

        if (expired) {
          const refreshed = await refreshTokens();
          if (refreshed?.user) {
            setUser(refreshed.user as User);
          }
        } else if (storedUser) {
          setUser(storedUser);
        }
      } catch {
        console.warn("[auth] init error");
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    if (result.user) {
      setUser(result.user as User);
      if (result.organization) {
        setOrganization(result.organization as Organization);
      }
    }
    return { error: result.error };
  }, []);

  const switchOrganization = useCallback(async (orgId: string) => {
    const result = await apiSwitchOrg(orgId);
    if (result.user) {
      setUser(result.user as User);
      if (result.organization) {
        setOrganization(result.organization as Organization);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setOrganization(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, organization, organizations, switchOrganization, isLoading, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
