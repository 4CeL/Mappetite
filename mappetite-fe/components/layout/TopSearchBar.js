"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, Bell, ChevronDown, User, LogOut, Settings, Globe } from "lucide-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { useI18n } from "@/lib/i18n";

export default function TopSearchBar({
  searchQuery = "",
  onSearchChange,
  align = "left",
  className = "",
}) {
  const { user, logout, changeLanguage } = useAuth();
  const { t, lang, setLanguage } = useI18n();
  const [profileOpen, setProfileOpen] = useState(false);
  const searchInputRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    if (!profileOpen) return;
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [profileOpen]);

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const displayName = user?.username || "Stefanus";

  return (
    <header
      className={`w-full flex items-center justify-between gap-4 py-4 px-6 select-none ${className}`}
    >
      {/* Search Input (Responsive, default left-aligned) */}
      <div className={`flex-1 max-w-md sm:max-w-lg ${align === "center" ? "mx-auto" : ""}`}>
        <label className="relative flex items-center w-full">
          <Search className="size-4 absolute left-4 text-ink-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={t("topbar.searchPlaceholder")}
            className="w-full rounded-2xl border border-[#E7E2D5] bg-white/90 pl-11 pr-4 py-2.5 text-xs sm:text-sm text-ink-900 placeholder:text-ink-400 shadow-sm focus:border-primary-700 focus:bg-white focus:outline-none transition-all"
          />
        </label>
      </div>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification Bell */}
        <button
          type="button"
          className="relative size-10 rounded-full flex items-center justify-center text-ink-600 hover:text-ink-900 hover:bg-[#F2EFE8] transition-colors"
          aria-label={t("topbar.notifications")}
        >
          <Bell className="size-5" />
          <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-[#D96B43]" />
        </button>

        {/* User Profile Menu */}
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-full p-1 sm:pr-2.5 hover:bg-[#F2EFE8] transition-colors"
          >
            <div className="size-8 rounded-full bg-visited-700 text-white flex items-center justify-center text-xs font-bold uppercase overflow-hidden shadow-xs">
              {displayName.charAt(0)}
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-ink-800">
              {displayName}
            </span>
            <ChevronDown className="size-3.5 text-ink-500 hidden sm:inline" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl border border-line bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-line mb-1">
                <p className="text-xs font-bold text-ink-900">{displayName}</p>
                <p className="text-[11px] text-ink-500 truncate">{user?.email || "demo@mappetite.local"}</p>
              </div>

              <Link
                href="/settings/"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-ink-700 hover:bg-[#F4F1EA] transition-colors"
              >
                <Settings className="size-4 text-ink-500" />
                {t("topbar.profileSettings")}
              </Link>

              {/* Language Switch */}
              <button
                type="button"
                onClick={() => {
                  const next = lang === "id" ? "en" : "id";
                  if (changeLanguage) changeLanguage(next);
                  else setLanguage(next);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-ink-700 hover:bg-[#F4F1EA] transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Globe className="size-4 text-ink-500" />
                  {t("topbar.language")} ({lang.toUpperCase()})
                </span>
                <span className="text-[10px] font-bold text-primary-700 uppercase">
                  {t("topbar.switchTo", { lang: lang === "id" ? "EN" : "ID" })}
                </span>
              </button>

              <div className="my-1 border-t border-line" />

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-danger-600 hover:bg-danger-50 transition-colors"
              >
                <LogOut className="size-4 text-danger-600" />
                {t("auth.logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
