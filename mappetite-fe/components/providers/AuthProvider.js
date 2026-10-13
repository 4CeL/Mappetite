"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";

import { api } from "@/lib/api";
import { getStoredLanguage, setLanguage, useI18n } from "@/lib/i18n";
import { useHydrated } from "@/lib/local-store";
import { clearSession, setSession, tokenExpired, updateSessionUser, useSessionValue } from "@/lib/session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const hydrated = useHydrated();
  const stored = useSessionValue();
  const session = hydrated && stored?.token ? stored : null;
  const token = session?.token ?? null;
  const { lang } = useI18n();

  // Drop expired tokens and refresh the profile once per token.
  useEffect(() => {
    if (!token) return undefined;
    if (tokenExpired(token)) {
      clearSession();
      return undefined;
    }
    let cancelled = false;
    api
      .me()
      .then((user) => {
        if (!cancelled) updateSessionUser(user);
      })
      .catch(() => {
        // A 401 already cleared the session inside apiRequest; other errors keep the cached user.
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const signIn = useCallback((data) => {
    setSession({ token: data.token, user: data.user });
    // Adopt the account's language unless the user already picked one on this device.
    if (!getStoredLanguage() && data.user?.preferred_language) setLanguage(data.user.preferred_language);
  }, []);

  const signOut = useCallback(() => clearSession(), []);

  const changeLanguage = useCallback(
    (next) => {
      setLanguage(next);
      if (token && next !== session?.user?.preferred_language) {
        api
          .updateMe({ preferred_language: next })
          .then(updateSessionUser)
          .catch(() => {});
      }
    },
    [token, session?.user?.preferred_language],
  );

  const value = useMemo(
    () => ({
      hydrated,
      token,
      user: session?.user ?? null,
      signIn,
      signOut,
      changeLanguage,
      // Language sent with requests that produce localized data (reverse geocoding).
      lang,
    }),
    [hydrated, token, session?.user, signIn, signOut, changeLanguage, lang],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
