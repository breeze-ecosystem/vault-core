"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getUser, getAccessToken, refreshTokens, logout as authLogout } from "@/lib/auth-client";

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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const stored = getUser();
      if (stored) {
        setUser(stored);
        setIsLoading(false);
        return;
      }

      const token = getAccessToken();
      if (!token) {
        const refreshed = await refreshTokens();
        if (refreshed?.user) {
          setUser(refreshed.user);
        }
      }
      setIsLoading(false);
    }
    init();
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
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
