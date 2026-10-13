"use client";

import { ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";

import { shortArea } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import PlaceThumb from "./PlaceThumb";
import { RatingPill } from "./Rating";
import StatusBadge from "./StatusBadge";

function CardBody({ place, compact }) {
  const { formatDistance } = useI18n();
  const area = shortArea(place.address);
  const distance = formatDistance(place.distanceKm);
  const tags = place.tags.slice(0, compact ? 1 : 3);
  const extraTags = place.tags.length - tags.length;

  return (
    <>
      <PlaceThumb
        place={place}
        className={compact ? "size-[4.25rem]" : "size-[5.75rem]"}
        iconClassName={compact ? "size-7" : "size-9"}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-start justify-between gap-2">
          <span className={`truncate font-bold text-ink-900 ${compact ? "text-sm" : "text-base"}`}>{place.name}</span>
          {!compact ? <StatusBadge status={place.status} /> : null}
        </span>
        {area || distance ? (
          <span className="truncate text-xs text-ink-500">{[area, compact ? distance : null].filter(Boolean).join(" · ")}</span>
        ) : null}
        {!compact && (distance || place.rating != null) ? (
          <span className="flex items-center gap-3 text-xs text-ink-600">
            {distance ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 text-ink-500" aria-hidden="true" />
                {distance}
              </span>
            ) : null}
            <RatingPill value={place.rating} />
          </span>
        ) : null}
        <span className="flex flex-wrap items-center gap-1.5">
          {compact ? <StatusBadge status={place.status} /> : null}
          {compact ? <RatingPill value={place.rating} /> : null}
          {tags.map((tag) => (
            <span key={tag.id} className="tag">
              {tag.name}
            </span>
          ))}
          {extraTags > 0 ? <span className="tag">+{extraTags}</span> : null}
        </span>
      </span>
    </>
  );
}

/**
 * Restaurant card. Renders a Link when `href` is set (list page), otherwise a
 * button that selects the place on the map.
 */
export default function PlaceCard({ place, href, onSelect, selected = false, compact = false }) {
  const className = `card flex w-full items-center gap-4 p-3 text-left transition-shadow hover:shadow-pop ${
    selected ? "ring-[1.5px] ring-primary-700" : ""
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        <CardBody place={place} compact={compact} />
        <ChevronRight className="size-5 shrink-0 text-ink-400" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={() => onSelect?.(place.id)} aria-pressed={selected}>
      <CardBody place={place} compact={compact} />
    </button>
  );
}

export function PlaceCardSkeleton({ compact = false }) {
  return (
    <div className="card flex items-center gap-4 p-3" aria-hidden="true">
      <div className={`skeleton shrink-0 rounded-xl ${compact ? "size-[4.25rem]" : "size-[5.75rem]"}`} />
      <div className="flex flex-1 flex-col gap-2">
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-3 w-1/3" />
      </div>
    </div>
  );
}
