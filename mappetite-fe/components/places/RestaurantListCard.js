"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  MapPin,
  MoreVertical,
  Star,
  Check,
  Bookmark,
  Trash2,
  Edit2,
  Navigation,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { formatRelativeTime, getFoodPhoto } from "@/lib/food-images";
import PlaceThumb from "./PlaceThumb";

export default function RestaurantListCard({
  place,
  viewMode = "list",
  onDelete,
}) {
  const { lang, t } = useI18n();
  const [imgError, setImgError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const photoUrl = getFoodPhoto(place);
  const relativeTime = formatRelativeTime(place.created_at, lang);

  // Status badge styling matching the design mockup
  const renderStatusBadge = () => {
    if (place.status === "visited") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DBEBD7] bg-[#EDF4EB] px-3 py-1 text-xs font-semibold text-[#4E8746]">
          <Check className="size-3 stroke-[2.5]" aria-hidden="true" />
          <span>Visited</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FCDFD3] bg-[#FDF1EB] px-3 py-1 text-xs font-semibold text-[#D96B43]">
        <Bookmark className="size-3 fill-current" aria-hidden="true" />
        <span>Want to Visit</span>
      </span>
    );
  };

  const detailUrl = `/places/detail/?id=${encodeURIComponent(place.id)}`;

  // List View Layout (matches image exactly)
  if (viewMode === "list") {
    return (
      <div className="group relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl border border-[#ECE7DD] bg-white p-3.5 shadow-sm transition-all hover:border-[#DCD5C5] hover:shadow-md">
        {/* Left: Thumbnail Image */}
        <Link
          href={detailUrl}
          className="relative h-40 sm:h-28 w-full sm:w-44 shrink-0 overflow-hidden rounded-xl bg-stone-100 block"
        >
          {!imgError ? (
            <img
              src={photoUrl}
              alt={place.name}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <PlaceThumb place={place} className="size-full rounded-none" iconClassName="size-10" />
            </div>
          )}
        </Link>

        {/* Middle: Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          {/* Place Name with External Link */}
          <div className="flex items-center gap-1.5">
            <Link
              href={detailUrl}
              className="truncate text-base font-bold text-ink-900 transition-colors hover:text-primary-700"
            >
              {place.name}
            </Link>
            {place.google_maps_url ? (
              <a
                href={place.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                title="Buka di Google Maps"
                className="text-ink-400 hover:text-ink-700 transition-colors p-0.5 rounded"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>

          {/* Address */}
          {place.address ? (
            <div className="flex items-center gap-1 text-xs text-ink-500">
              <MapPin className="size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
              <span className="truncate">{place.address}</span>
            </div>
          ) : null}

          {/* Rating & Category Meta */}
          <div className="flex items-center gap-2 text-xs text-ink-600">
            {place.rating != null ? (
              <div className="flex items-center gap-1 font-semibold text-ink-800">
                <Star className="size-3.5 text-[#F59E0B] fill-current" aria-hidden="true" />
                <span>{Number(place.rating).toFixed(1)}</span>
                <span className="font-normal text-ink-400">(user)</span>
              </div>
            ) : (
              <span className="text-ink-400">Belum dirating</span>
            )}
            <span className="text-ink-300">·</span>
            <span className="font-medium text-ink-600">
              {place.tags?.[0]?.name || (place.price_level ? "$".repeat(place.price_level) : "Restaurant")}
            </span>
          </div>

          {/* Tags Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {place.tags?.slice(0, 4).map((tag) => (
              <span
                key={tag.id}
                className="rounded-md bg-[#F4F1EA] px-2.5 py-0.5 text-[11px] font-medium text-ink-700"
              >
                {tag.name}
              </span>
            ))}
            {place.tags?.length > 4 && (
              <span className="rounded-md bg-[#F4F1EA] px-2 py-0.5 text-[11px] font-medium text-ink-500">
                +{place.tags.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Right: Status Badge & Footer Time/Menu */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-between shrink-0 self-stretch sm:pl-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F0EBE0]">
          <div>{renderStatusBadge()}</div>

          <div className="flex items-center gap-2 text-xs text-ink-400">
            {relativeTime && <span className="text-[11px]">{relativeTime}</span>}

            {/* Three Dots Action Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-full p-1 text-ink-400 hover:bg-stone-100 hover:text-ink-700 transition-colors"
                aria-label="Opsi lainnya"
              >
                <MoreVertical className="size-4" aria-hidden="true" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 bottom-full sm:bottom-auto sm:top-full mb-1 sm:mb-0 sm:mt-1 z-50 w-44 rounded-xl border border-line bg-white py-1.5 shadow-lg">
                    <Link
                      href={detailUrl}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-ink-800 hover:bg-stone-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Edit2 className="size-3.5 text-ink-500" />
                      Detail & Edit
                    </Link>
                    {place.google_maps_url && (
                      <a
                        href={place.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 text-xs text-ink-800 hover:bg-stone-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Navigation className="size-3.5 text-primary-600" />
                        Rute di Google Maps
                      </a>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(place);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-danger-600 hover:bg-danger-50"
                      >
                        <Trash2 className="size-3.5 text-danger-600" />
                        Hapus Restoran
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid View Layout (when user toggles grid)
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#ECE7DD] bg-white shadow-sm transition-all hover:border-[#DCD5C5] hover:shadow-md">
      {/* Top Image */}
      <Link href={detailUrl} className="relative h-44 w-full bg-stone-100 block overflow-hidden">
        {!imgError ? (
          <img
            src={photoUrl}
            alt={place.name}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PlaceThumb place={place} className="size-full rounded-none" iconClassName="size-12" />
          </div>
        )}
        <div className="absolute top-3 right-3">{renderStatusBadge()}</div>
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={detailUrl}
            className="truncate text-base font-bold text-ink-900 transition-colors hover:text-primary-700"
          >
            {place.name}
          </Link>
          {place.google_maps_url ? (
            <a
              href={place.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-400 hover:text-ink-700 transition-colors p-0.5 rounded"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>

        {place.address && (
          <div className="flex items-center gap-1 text-xs text-ink-500">
            <MapPin className="size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
            <span className="truncate">{place.address}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-ink-600">
          {place.rating != null ? (
            <div className="flex items-center gap-1 font-semibold text-ink-800">
              <Star className="size-3.5 text-[#F59E0B] fill-current" aria-hidden="true" />
              <span>{Number(place.rating).toFixed(1)}</span>
            </div>
          ) : (
            <span className="text-ink-400">Belum dirating</span>
          )}
          <span className="text-ink-300">·</span>
          <span className="font-medium text-ink-600">
            {place.tags?.[0]?.name || (place.price_level ? "$".repeat(place.price_level) : "Restaurant")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {place.tags?.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="rounded-md bg-[#F4F1EA] px-2.5 py-0.5 text-[11px] font-medium text-ink-700"
            >
              {tag.name}
            </span>
          ))}
        </div>

        <div className="mt-2 pt-2 border-t border-[#F0EBE0] flex items-center justify-between text-xs text-ink-400">
          <span>{relativeTime}</span>
          <Link
            href={detailUrl}
            className="text-xs font-semibold text-primary-700 hover:underline"
          >
            Detail &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
