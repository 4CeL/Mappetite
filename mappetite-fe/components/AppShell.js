"use client";

import { List, Map as MapIcon, Plus, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import LanguageToggle from "@/components/LanguageToggle";
import Logo, { LogoMark } from "@/components/Logo";
import AddPlaceModal from "@/components/places/AddPlaceModal";
import EditPlaceModal from "@/components/places/EditPlaceModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { useI18n } from "@/lib/i18n";

const PUBLIC_ROUTES = ["/login", "/register"];

function normalize(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "");
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream" aria-busy="true">
      <LogoMark className="size-16 animate-pulse" />
    </div>
  );
}

function DesktopHeader({ path }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { openAdd } = usePlaces();
  const links = [
    { href: "/", label: t("nav.map") },
    { href: "/list/", label: t("nav.list") },
  ];

  return (
    <header className="sticky top-0 z-[1000] hidden h-[4.5rem] items-center gap-8 border-b border-line bg-white px-6 lg:flex">
      <Link href="/" aria-label="Mappetite" className="rounded-lg">
        <Logo />
      </Link>
      <nav aria-label={t("nav.main")} className="flex items-center gap-2">
        {links.map((link) => {
          const active = normalize(link.href) === path;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-5 py-2 text-sm transition-colors ${
                active ? "bg-primary-50 font-bold text-primary-800" : "font-medium text-ink-600 hover:text-ink-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-4">
        <LanguageToggle />
        <button type="button" onClick={openAdd} className="btn btn-primary px-5">
          <Plus className="size-4" aria-hidden="true" />
          {t("nav.addPlace")}
        </button>
        <Link
          href="/settings/"
          aria-label={t("nav.profile")}
          aria-current={path === "/settings" ? "page" : undefined}
          className="flex size-10 items-center justify-center rounded-full bg-visited-50 text-sm font-bold uppercase text-visited-700"
        >
          {user?.username?.[0] ?? <User className="size-4" aria-hidden="true" />}
        </Link>
      </div>
    </header>
  );
}

/** Phone tab bar: Explore (map) · Add · List. Profile and logout live in the top bar's profile menu. */
function MobileTabBar({ path }) {
  const { t } = useI18n();
  const { openAdd } = usePlaces();

  const tab = (href, label, Icon) => {
    const active = normalize(href) === path;
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
          active ? "font-bold text-primary-800" : "font-medium text-ink-600"
        }`}
      >
        <Icon className={`size-5 ${active ? "text-primary-700" : ""}`} aria-hidden="true" />
        {label}
      </Link>
    );
  };

  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-0 bottom-0 z-[1000] grid h-[var(--mp-tabbar-h)] grid-cols-3 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {tab("/", t("nav.explore"), MapIcon)}
      <button
        type="button"
        onClick={openAdd}
        className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-ink-600"
      >
        <span className="-mt-3 flex size-12 items-center justify-center rounded-full bg-primary-700 text-white shadow-pop ring-4 ring-white">
          <Plus className="size-6" aria-hidden="true" />
        </span>
        {t("nav.add")}
      </button>
      {tab("/list/", t("nav.list"), List)}
    </nav>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, token } = useAuth();
  const { t } = useI18n();
  const path = normalize(pathname);
  const isPublic = PUBLIC_ROUTES.includes(path);

  useEffect(() => {
    if (!hydrated) return;
    if (!token && !isPublic) router.replace("/login/");
    else if (token && isPublic) router.replace("/");
  }, [hydrated, token, isPublic, router]);

  // Halaman yang punya layout custom (render header/sidebar sendiri)
  const isCustomLayout =
    path === "/list" ||
    path === "/" ||
    path === "/settings" ||
    path.startsWith("/places/detail");

  if (!hydrated || (!token && !isPublic) || (token && isPublic)) return <Splash />;

  if (isPublic) return children;

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-[1200] rounded-lg bg-white px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t("nav.skipToContent")}
      </a>
      {!isCustomLayout && <DesktopHeader path={path} />}
      {/* The tab bar is fixed, so leave room for it below the page (the variable is 0 on desktop). */}
      <main id="main" className="flex-1 pb-[var(--mp-tabbar-h)]">
        {children}
      </main>
      <MobileTabBar path={path} />
      <AddPlaceModal />
      <EditPlaceModal />
    </div>
  );
}