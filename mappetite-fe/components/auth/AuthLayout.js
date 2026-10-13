"use client";

import LanguageToggle from "@/components/LanguageToggle";
import Logo from "@/components/Logo";
import { useI18n } from "@/lib/i18n";

export default function AuthLayout({ title, subtitle, children, footer }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <div className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Logo />
        <LanguageToggle />
      </div>
      <main id="main" className="flex flex-1 items-start justify-center px-5 pb-10 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">
          <p className="mb-6 hidden text-center text-sm text-ink-600 sm:block">{t("app.tagline")}</p>
          <div className="card px-6 py-7 sm:px-8">
            <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-ink-500">{subtitle}</p> : null}
            <div className="mt-6">{children}</div>
          </div>
          {footer ? <p className="mt-5 text-center text-sm text-ink-600">{footer}</p> : null}
        </div>
      </main>
    </div>
  );
}
