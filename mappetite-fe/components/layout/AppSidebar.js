"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map as MapIcon,
  UtensilsCrossed,
  Bookmark,
} from "lucide-react";

import Logo from "@/components/Logo";
import LeftSidebarIllustration from "./LeftSidebarIllustration";
import { useI18n } from "@/lib/i18n";

export default function AppSidebar({
  counts = {},
  activeStatus = "all",
  onSelectStatus,
  className = "",
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  const navLinks = [
    { href: "/", label: t("nav.map"), icon: MapIcon, active: pathname === "/" || pathname === "" },
    { href: "/list/", label: t("nav.restaurants"), icon: UtensilsCrossed, active: pathname?.startsWith("/list") },
    { href: "/list/", label: t("nav.collection"), icon: Bookmark, active: false },
  ];

  return (
    <aside
      className={`w-64 shrink-0 flex flex-col justify-between border-r border-[#EAE5D9] bg-[#FAF8F3] p-5 select-none ${className}`}
    >
      <div className="flex flex-col gap-8">
        {/* Logo */}
        <Link href="/" className="inline-block py-1">
          <Logo />
        </Link>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-1.5" aria-label="Main Navigation">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors ${
                  item.active
                    ? "bg-[#E5EBDD] font-bold text-[#3F4A32]"
                    : "font-medium text-ink-600 hover:bg-[#F2EFE8] hover:text-ink-900"
                }`}
              >
                <Icon className={`size-[18px] ${item.active ? "text-[#3F4A32]" : "text-ink-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Illustration */}
      <div className="pt-4">
        <LeftSidebarIllustration />
      </div>
    </aside>
  );
}
