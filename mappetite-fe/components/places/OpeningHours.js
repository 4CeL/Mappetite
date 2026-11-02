"use client";

import { hasHours, isOpen24Hours, isOpenAt, minuteOfDayFrom } from "@/lib/hours";
import { useI18n } from "@/lib/i18n";
import { useNowMinute } from "@/lib/use-now";

/**
 * "Buka · 10.00 – 22.00" / "Tutup · 10.00 – 22.00" / "Buka 24 jam", computed from the viewer's clock.
 * Renders nothing when the restaurant has no hours. The status word (not just its colour) carries the meaning.
 */
export default function OpeningHours({ place, className = "" }) {
  const { t, formatTime } = useI18n();
  const nowMinute = useNowMinute();

  if (!hasHours(place)) return null;

  const open24 = isOpen24Hours(place.opens_at, place.closes_at);
  const range = t("hours.range", { open: formatTime(place.opens_at), close: formatTime(place.closes_at) });
  // Until the browser has hydrated we only know the range, not whether it is open right now.
  const open = nowMinute == null ? null : isOpenAt(place.opens_at, place.closes_at, minuteOfDayFrom(nowMinute));

  if (open24) {
    return <span className={`font-semibold text-[#4E8746] ${className}`}>{t("hours.open24")}</span>;
  }

  return (
    <span className={className}>
      {open === null ? null : (
        <>
          <span className={`font-semibold ${open ? "text-[#4E8746]" : "text-danger-700"}`}>
            {open ? t("hours.open") : t("hours.closed")}
          </span>
          <span className="text-ink-300"> · </span>
        </>
      )}
      <span className="text-ink-600">{range}</span>
    </span>
  );
}
