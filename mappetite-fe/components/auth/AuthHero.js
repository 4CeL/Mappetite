"use client";

import { Camera, Check, Clock, Coffee, MapPin, Soup, Star } from "lucide-react";

import Logo from "@/components/Logo";
import StatusBadge from "@/components/places/StatusBadge";
import { useI18n } from "@/lib/i18n";

/** Decorative "map" backdrop: blocks, roads, a dashed route and a few pins. Purely visual. */
function MapBackdrop({ className = "" }) {
  return (
    <svg
      viewBox="0 0 800 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
    >
      <g fill="#fff" fillOpacity="0.045">
        <rect x="-20" y="80" width="200" height="140" rx="26" />
        <rect x="230" y="40" width="190" height="210" rx="26" />
        <rect x="470" y="110" width="150" height="120" rx="26" />
        <rect x="660" y="30" width="200" height="190" rx="26" />
        <rect x="40" y="290" width="150" height="170" rx="26" />
        <rect x="250" y="320" width="230" height="130" rx="26" />
        <rect x="540" y="300" width="260" height="180" rx="26" />
        <rect x="-10" y="530" width="230" height="150" rx="26" />
        <rect x="280" y="520" width="170" height="190" rx="26" />
        <rect x="510" y="550" width="220" height="150" rx="26" />
        <rect x="90" y="760" width="260" height="160" rx="26" />
        <rect x="420" y="770" width="240" height="150" rx="26" />
      </g>
      <g fill="none" stroke="#fff" strokeOpacity="0.1" strokeLinecap="round">
        <path d="M-20 270C160 250 260 290 420 270S680 230 840 280" strokeWidth="16" />
        <path d="M-20 500C140 520 300 480 460 505S700 540 840 500" strokeWidth="16" />
        <path d="M-20 730C180 720 300 750 480 735S720 710 840 740" strokeWidth="12" />
        <path d="M210 -20C230 160 190 330 220 500S190 760 215 930" strokeWidth="14" />
        <path d="M455 -20C440 140 480 300 450 480S470 760 450 930" strokeWidth="12" />
        <path d="M650 -20C670 180 630 330 660 520S640 760 660 930" strokeWidth="14" />
      </g>
      {/* The route stays on the right so it never runs behind the headline. */}
      <path
        d="M640 880C700 780 560 740 600 640S720 520 650 420S560 300 640 210"
        fill="none"
        stroke="#EE8052"
        strokeOpacity="0.85"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="2 14"
      />
      <Pin x={640} y={210} />
      <Pin x={650} y={420} small />
      <Pin x={600} y={640} small />
    </svg>
  );
}

function Pin({ x, y, small = false }) {
  const s = small ? 0.75 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="4" rx="14" ry="5" fill="#000" fillOpacity="0.18" />
      <path d="M0 0C-4 -10 -22 -24 -22 -42A22 22 0 1 1 22 -42C22 -24 4 -10 0 0Z" fill="#EE8052" />
      <circle cx="0" cy="-42" r="9" fill="#fff" />
    </g>
  );
}

/** Two sample restaurant cards, so the page shows what the app looks like. They are decoration only. */
function SampleCards() {
  return (
    <div aria-hidden="true" className="relative h-[11.5rem] w-full max-w-[32rem] select-none">
      <div
        className="mp-tilt mp-float absolute left-0 top-0 w-60 rounded-2xl bg-white p-3 text-ink-900 shadow-pop"
        style={{ "--mp-rot": "-3deg" }}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-visited-50 text-visited-500">
            <Soup className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">Ramen Ichiban</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-ink-600">
              <Star className="size-3 fill-star text-star" />
              4,8
              <span className="text-ink-400">·</span>
              Rp Rp
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <StatusBadge status="visited" />
          <span className="flex items-center gap-1 text-[11px] text-ink-500">
            <Clock className="size-3" />
            11.00 – 22.00
          </span>
        </div>
      </div>

      <div
        className="mp-tilt mp-float-slow absolute bottom-0 right-0 w-56 rounded-2xl bg-white p-3 text-ink-900 shadow-pop"
        style={{ "--mp-rot": "2.5deg" }}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
            <Coffee className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">Kopi Senja</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-ink-600">
              <MapPin className="size-3 text-visited-500" />
              1,2 km
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <StatusBadge status="wishlist" />
          <span className="flex items-center gap-1 text-[11px] text-ink-500">
            <Camera className="size-3" />3
          </span>
        </div>
      </div>
    </div>
  );
}

/** Left half of the desktop layout. */
export function AuthHero() {
  const { t } = useI18n();
  const title = t("auth.heroTitle");
  const accent = t("auth.heroTitleAccent");
  const at = title.indexOf(accent);
  const points = [t("auth.heroPoint1"), t("auth.heroPoint2"), t("auth.heroPoint3")];

  return (
    <aside className="relative hidden overflow-hidden bg-primary-800 text-white lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,#56663f_0%,transparent_60%),radial-gradient(90%_70%_at_100%_100%,#2f3826_0%,transparent_70%)]" />
      <MapBackdrop />

      <div className="relative">
        <Logo tone="light" />
      </div>

      <div className="relative max-w-lg">
        <h2 className="text-[2.6rem] font-extrabold leading-[1.1] tracking-tight xl:text-5xl">
          {at >= 0 ? (
            <>
              {title.slice(0, at)}
              <span className="text-[#F8B592]">{accent}</span>
              {title.slice(at + accent.length)}
            </>
          ) : (
            title
          )}
        </h2>
        <p className="mt-4 max-w-md text-base leading-relaxed text-primary-100">{t("auth.heroSubtitle")}</p>
        <ul className="mt-7 flex flex-col gap-3">
          {points.map((point) => (
            <li key={point} className="flex items-center gap-3 text-[15px] font-medium text-white/95">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative hidden [@media(min-height:800px)]:block">
        <SampleCards />
      </div>
    </aside>
  );
}

/** Top banner on phones and tablets; the form sheet slides up over its bottom edge. */
export function AuthBanner({ right }) {
  const { t } = useI18n();
  return (
    <header className="relative overflow-hidden bg-primary-800 px-6 pb-14 pt-5 text-white lg:hidden">
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,#56663f_0%,transparent_60%),radial-gradient(80%_80%_at_100%_100%,#2f3826_0%,transparent_70%)]" />
      <MapBackdrop className="opacity-60" />
      <div className="relative flex items-center justify-between">
        <Logo tone="light" />
        {right}
      </div>
      <div className="relative mt-7 max-w-sm">
        <h2 className="text-2xl font-extrabold leading-tight tracking-tight">{t("auth.heroBannerTitle")}</h2>
        <p className="mt-1.5 text-sm text-primary-100">{t("auth.heroBannerSubtitle")}</p>
      </div>
    </header>
  );
}
