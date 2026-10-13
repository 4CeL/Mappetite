"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map as MapIcon,
  UtensilsCrossed,
  Bookmark,
  Check,
} from "lucide-react";

import Logo from "@/components/Logo";
import LeftSidebarIllustration from "./LeftSidebarIllustration";

export default function AppSidebar({
  counts = {},
  activeStatus = "all",
  onSelectStatus,
  className = "",
}) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Map", icon: MapIcon, active: pathname === "/" || pathname === "" },
    { href: "/list/", label: "Restaurants", icon: UtensilsCrossed, active: pathname?.startsWith("/list") },
    { href: "/list/", label: "Collection", icon: Bookmark, active: false },
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

        {/* My Lists Section */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#EAE5D9]">
          <h2 className="px-4 text-xs font-semibold text-ink-500 tracking-wide">My Lists</h2>
          <div className="flex flex-col gap-1">
            {/* Want to Visit */}
            <button
              type="button"
              onClick={() => onSelectStatus?.(activeStatus === "wishlist" ? "all" : "wishlist")}
              className={`flex items-center justify-between rounded-xl px-4 py-2 text-xs transition-colors ${
                activeStatus === "wishlist"
                  ? "bg-[#FDF1EB] font-bold text-[#D96B43]"
                  : "font-medium text-ink-700 hover:bg-[#F4F0E6]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-5 items-center justify-center rounded-full bg-[#FCE8DE] text-[#D96B43]">
                  <Bookmark className="size-3 fill-current" />
                </span>
                <span>Want to Visit</span>
              </div>
              <span className="font-semibold text-ink-400">{counts.wishlist ?? 0}</span>
            </button>

            {/* Visited */}
            <button
              type="button"
              onClick={() => onSelectStatus?.(activeStatus === "visited" ? "all" : "visited")}
              className={`flex items-center justify-between rounded-xl px-4 py-2 text-xs transition-colors ${
                activeStatus === "visited"
                  ? "bg-[#EDF4EB] font-bold text-[#4E8746]"
                  : "font-medium text-ink-700 hover:bg-[#F4F0E6]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-5 items-center justify-center rounded-full bg-[#E0EEDD] text-[#4E8746]">
                  <Check className="size-3 stroke-[2.5]" />
                </span>
                <span>Visited</span>
              </div>
              <span className="font-semibold text-ink-400">{counts.visited ?? 0}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Illustration */}
      <div className="pt-4">
        <LeftSidebarIllustration />
      </div>
    </aside>
  );
}
