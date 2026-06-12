import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type AuthUser } from "../api/client";

export type { AuthUser };

export type SocialProvider = "google" | "apple" | "github";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithSocial: (provider: SocialProvider) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const nextUser = await api.getMe();
      setUser(nextUser);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    api
      .getMe()
      .then((nextUser) => {
        if (!active) return;
        setUser(nextUser);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    await api.requestMagicLink(email);
  }, []);

  const signInWithSocial = useCallback(async (provider: SocialProvider) => {
    const url = await api.getOAuthStartUrl(provider);
    window.location.assign(url);
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithEmail,
      signInWithSocial,
      signOut,
      refreshUser,
      setUser,
    }),
    [user, loading, signInWithEmail, signInWithSocial, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function getAuthDisplayName(user: AuthUser | null) {
  if (!user) return null;
  if (user.display_name?.trim()) return user.display_name.trim();
  if (user.email) return user.email.split("@")[0];
  return "Signed in";
}
