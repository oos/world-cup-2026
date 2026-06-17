import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import posthog from "posthog-js";
import { api, type AuthUser } from "../api/client";

export type { AuthUser };

export type SocialProvider = "google" | "apple" | "github";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
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

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const nextUser = await api.loginWithPassword(email, password);
    setUser(nextUser);
    posthog.identify(String(nextUser.id), { email: nextUser.email, name: nextUser.display_name });
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const nextUser = await api.registerWithPassword(email, password);
    setUser(nextUser);
    posthog.identify(String(nextUser.id), { email: nextUser.email, name: nextUser.display_name });
  }, []);

  const signInWithSocial = useCallback(async (provider: SocialProvider) => {
    const url = await api.getOAuthStartUrl(provider);
    window.location.assign(url);
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    posthog.capture("user_signed_out");
    setUser(null);
    posthog.reset();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithEmail,
      signInWithPassword,
      signUpWithPassword,
      signInWithSocial,
      signOut,
      refreshUser,
      setUser,
    }),
    [user, loading, signInWithEmail, signInWithPassword, signUpWithPassword, signInWithSocial, signOut, refreshUser],
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
