"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { LANGUAGES, useI18n } from "@/lib/i18n";

export default function LanguageToggle({ className = "" }) {
  const { lang, t } = useI18n();
  const { changeLanguage } = useAuth();

  return (
    <div role="group" aria-label={t("lang.label")} className={`inline-flex rounded-full bg-chip p-0.5 ${className}`}>
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={lang === code}
          title={t(`lang.${code}`)}
          onClick={() => changeLanguage(code)}
          className={`min-h-8 min-w-10 rounded-full px-2.5 text-[13px] font-bold uppercase transition-colors ${
            lang === code ? "bg-white text-ink-900 shadow-card" : "text-ink-500 hover:text-ink-900"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
