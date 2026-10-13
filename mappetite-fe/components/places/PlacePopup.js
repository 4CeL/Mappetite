"use client";

import { X } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import PlaceActions from "./PlaceActions";
import { RatingPill } from "./Rating";
import StatusBadge from "./StatusBadge";

const PRICE = ["$", "$$", "$$$", "$$$$"];

/** Desktop popup anchored above the selected marker. */
export default function PlacePopup({ place, onClose }) {
  const { t } = useI18n();
  return (
    <div className="relative w-[18rem] rounded-2xl bg-white p-4 shadow-pop" role="region" aria-label={place.name}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold leading-snug text-ink-900">{place.name}</h3>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-chip"
          aria-label={t("place.closePopup")}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {place.address ? <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{place.address}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={place.status} long />
        <RatingPill value={place.rating} />
        {place.price_level ? <span className="tag">{PRICE[place.price_level - 1]}</span> : null}
      </div>
      {place.notes ? <p className="mt-3 line-clamp-2 text-xs italic text-ink-600">“{place.notes}”</p> : null}
      <div className="mt-4">
        <PlaceActions place={place} size="sm" />
      </div>
      <span
        className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 bg-white"
        aria-hidden="true"
      />
    </div>
  );
}
