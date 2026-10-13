"use client";

import { Bookmark, Check } from "lucide-react";

import { useI18n } from "@/lib/i18n";

export default function StatusBadge({ status, long = false, className = "" }) {
  const { t } = useI18n();
  const visited = status === "visited";
  const label = t(`status.${visited ? "visited" : "wishlist"}${long ? "Long" : ""}`);
  const Icon = visited ? Check : Bookmark;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ${
        visited ? "bg-visited-50 text-visited-700" : "bg-primary-50 text-primary-800"
      } ${className}`}
    >
      <Icon className="size-3" strokeWidth={visited ? 3 : 2.5} aria-hidden="true" />
      {label}
    </span>
  );
}
