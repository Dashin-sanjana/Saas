import { useQueryClient } from "@tanstack/react-query";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/resources";
import { getRefreshToken, setTokens } from "../api/client";
import type { User } from "../types/domain";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (body: { name: string; email: string; password: string; timezone: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!getRefreshToken()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => setTokens(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      login: async (email: string, password: string) => {
        const session = await authApi.login({ email, password });
        setTokens(session);
        setUser(session.user);
      },
      register: async (body: { name: string; email: string; password: string; timezone: string }) => {
        const session = await authApi.register(body);
        setTokens(session);
        setUser(session.user);
      },
      logout: async () => {
        await authApi.logout().catch(() => undefined);
        setTokens(null);
        setUser(null);
        queryClient.clear();
      }
    }),
    [loading, queryClient, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
