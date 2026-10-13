"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { useI18n } from "@/lib/i18n";
import { directionsUrl } from "@/lib/maps";

/** "Detail" + "Rute di Maps" buttons used by the popup and the mobile bottom sheet. */
export default function PlaceActions({ place, size = "md", onNavigate }) {
  const { t } = useI18n();
  const small = size === "sm";
  return (
    <div className="grid grid-cols-2 gap-2">
      <Link
        href={`/places/detail/?id=${encodeURIComponent(place.id)}`}
        onClick={onNavigate}
        className={`btn btn-outline ${small ? "btn-sm" : ""}`}
      >
        {small ? t("place.detail") : t("place.detailShort")}
      </Link>
      <a
        href={directionsUrl(place)}
        target="_blank"
        rel="noopener noreferrer"
        className={`btn btn-primary ${small ? "btn-sm" : ""}`}
      >
        {t("place.directions")}
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}
