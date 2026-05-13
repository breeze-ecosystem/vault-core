import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  getUserAsync,
  getAccessTokenAsync,
} from "@/lib/auth-storage";
import { login as apiLogin, refreshTokens, logout as apiLogout } from "@/lib/auth-client";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({}),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const stored = await getUserAsync();
      if (stored) {
        setUser(stored);
        setIsLoading(false);
        return;
      }
      const token = await getAccessTokenAsync();
      if (token) {
        const refreshed = await refreshTokens();
        if (refreshed?.user) {
          setUser(refreshed.user as User);
        }
      }
      setIsLoading(false);
    }
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    if (result.user) {
      setUser(result.user as User);
    }
    return { error: result.error };
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
