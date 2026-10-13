"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";

import { createLocalStore, useHydrated } from "../local-store";
import { formatDate, formatDistance, formatNumber } from "../format";
import en from "./en";
import id from "./id";

export const LANGUAGES = ["id", "en"];
const DICTIONARIES = { id, en };

function detectLanguage() {
  if (typeof navigator === "undefined") return "id";
  return (navigator.language || "id").toLowerCase().startsWith("en") ? "en" : "id";
}

// `null` means "not chosen yet": we fall back to the browser language.
const languageStore = createLocalStore("mappetite.lang", {
  parse: (raw) => (LANGUAGES.includes(raw) ? raw : null),
  serialize: (value) => value,
});

export function getStoredLanguage() {
  return languageStore.get();
}

export function setLanguage(lang) {
  if (LANGUAGES.includes(lang)) languageStore.set(lang);
}

function interpolate(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] == null ? match : String(vars[name])));
}

const I18nContext = createContext(null);

export function LanguageProvider({ children }) {
  const stored = languageStore.useValue();
  const hydrated = useHydrated();
  // Prerender and hydration render "id"; the stored/browser language applies right after hydration.
  const lang = stored || (hydrated ? detectLanguage() : "id");

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key, vars) => interpolate(DICTIONARIES[lang][key] ?? DICTIONARIES.id[key] ?? key, vars),
    [lang],
  );

  const value = useMemo(
    () => ({
      lang,
      setLanguage,
      t,
      /** Translate an ApiError (or any error) into a user-facing message. */
      tError: (error) => {
        const key = error?.key ? `errors.${error.key}` : "errors.unknown";
        return DICTIONARIES[lang][key] ?? DICTIONARIES.id[key] ?? t("errors.unknown");
      },
      formatNumber: (value, digits) => formatNumber(value, lang, digits),
      formatDistance: (km) => formatDistance(km, lang),
      formatDate: (value) => formatDate(value, lang),
    }),
    [lang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside LanguageProvider");
  return context;
}
