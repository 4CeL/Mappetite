"use client";

import { Sparkles } from "lucide-react";

import { AuthBanner, AuthHero } from "@/components/auth/AuthHero";
import LanguageToggle from "@/components/LanguageToggle";

/**
 * Login / register shell. Desktop: brand panel on the left, form on the right.
 * Phone: a brand banner on top with the form sheet overlapping its bottom edge.
 */
export default function AuthLayout({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="min-h-dvh bg-cream lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <AuthHero />
      <AuthBanner right={<LanguageToggle />} />

      <main
        id="main"
        className="relative z-10 -mt-7 rounded-t-[1.75rem] bg-cream px-6 pb-10 pt-8 sm:px-10 lg:mt-0 lg:flex lg:min-h-dvh lg:flex-col lg:rounded-none lg:px-14 lg:py-8"
      >
        <div className="hidden justify-end lg:flex">
          <LanguageToggle />
        </div>
        <div className="mx-auto w-full max-w-md lg:my-auto">
          {eyebrow ? (
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-800">
              <Sparkles className="size-3.5 text-visited-500" aria-hidden="true" />
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight text-ink-900 lg:text-[2rem]">
            {title}
          </h1>
          {subtitle ? <p className="mt-1.5 text-balance text-[15px] text-ink-600">{subtitle}</p> : null}
          <div className="mt-7">{children}</div>
          {footer ? (
            <p className="mt-8 border-t border-line pt-6 text-center text-sm text-ink-600">{footer}</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
