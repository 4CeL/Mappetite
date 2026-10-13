"use client";

import { Plus, RotateCcw } from "lucide-react";
import Link from "next/link";

import { LogoMark } from "@/components/Logo";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { useI18n } from "@/lib/i18n";

/** `kind`: "empty" (no places at all), "filtered" (no match), "error". */
export default function EmptyState({ kind = "empty", onRetry, className = "" }) {
  const { t, tError } = useI18n();
  const { openAdd, resetFilters, error } = usePlaces();

  let title = t("empty.title");
  let body = t("empty.body");
  let action = (
    <>
      <button type="button" onClick={openAdd} className="btn btn-primary hidden lg:inline-flex">
        <Plus className="size-4" aria-hidden="true" />
        {t("empty.cta")}
      </button>
      <Link href="/places/new/" className="btn btn-primary lg:hidden">
        <Plus className="size-4" aria-hidden="true" />
        {t("empty.cta")}
      </Link>
    </>
  );

  if (kind === "filtered") {
    title = t("empty.filteredTitle");
    body = t("empty.filteredBody");
    action = (
      <button type="button" onClick={resetFilters} className="btn btn-outline">
        <RotateCcw className="size-4" aria-hidden="true" />
        {t("filters.reset")}
      </button>
    );
  } else if (kind === "error") {
    title = t("common.loadError");
    body = tError(error);
    action = (
      <button type="button" onClick={onRetry} className="btn btn-outline">
        <RotateCcw className="size-4" aria-hidden="true" />
        {t("common.retry")}
      </button>
    );
  }

  return (
    <div className={`flex flex-col items-center px-6 py-10 text-center ${className}`} role={kind === "error" ? "alert" : "status"}>
      <LogoMark className="size-16 opacity-90" />
      <h2 className="mt-4 text-base font-bold text-ink-900">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-ink-500">{body}</p>
      <div className="mt-5">{action}</div>
    </div>
  );
}
