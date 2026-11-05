"use client";

import { ArrowRight, CalendarDays, ChevronDown, Clock, MapPin, Navigation, Pencil, RotateCcw, Star, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import BottomSheet from "@/components/places/BottomSheet";
import EmptyState from "@/components/places/EmptyState";
import OpeningHours from "@/components/places/OpeningHours";
import PlaceThumb from "@/components/places/PlaceThumb";
import { StarRating } from "@/components/places/Rating";
import StatusBadge from "@/components/places/StatusBadge";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { getFoodPhoto } from "@/lib/food-images";
import { shortArea } from "@/lib/format";
import { hasHours } from "@/lib/hours";
import { useI18n } from "@/lib/i18n";
import { openInMapsUrl } from "@/lib/maps";

const EXPLORE_SNAPS = ["collapsed", "half", "full"];
const DETAIL_SNAPS = ["half", "full"];

function Photo({ place, alt = "", className = "", iconClassName = "size-10" }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <PlaceThumb place={place} className={`size-full rounded-none ${className}`} iconClassName={iconClassName} />;
  return (
    <img
      src={getFoodPhoto(place)}
      alt={alt}
      onError={() => setFailed(true)}
      className={`size-full object-cover ${className}`}
      loading="lazy"
    />
  );
}

/* ── Explore: one card in the sideways carousel ─────────────────── */
function ExploreCard({ place, onSelect }) {
  const { t, formatDistance, formatNumber } = useI18n();
  const distance = formatDistance(place.distanceKm);
  const tag = place.tags?.[0]?.name;

  return (
    <article
      id={`sheet-card-${place.id}`}
      className="w-[17.5rem] shrink-0 snap-start overflow-hidden rounded-3xl border border-line bg-white shadow-card"
    >
      {/* The top part opens the restaurant on the map. What is below it is revealed by pulling the sheet up. */}
      <button type="button" onClick={() => onSelect(place.id)} className="block w-full text-left">
        <div className="relative h-36 bg-stone-100">
          <Photo place={place} />
          <StatusBadge status={place.status} className="absolute left-3 top-3 shadow-card" />
          {distance ? (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink-900 shadow-card">
              <MapPin className="size-3 text-visited-500" aria-hidden="true" />
              {distance}
            </span>
          ) : null}
        </div>
        <div className="px-4 pb-3 pt-3">
          <h3 className="truncate text-base font-extrabold text-ink-900">{place.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-600">
            {place.rating != null ? (
              <>
                <Star className="size-3.5 fill-star text-star" aria-hidden="true" />
                <span className="font-bold text-ink-900">{formatNumber(place.rating, 1)}</span>
              </>
            ) : (
              <span className="text-ink-500">{t("place.notRated")}</span>
            )}
            {place.price_level ? (
              <>
                <span className="text-ink-400" aria-hidden="true">·</span>
                <span>{t(`price.${place.price_level}`)}</span>
              </>
            ) : null}
            {tag ? (
              <>
                <span className="text-ink-400" aria-hidden="true">·</span>
                <span className="truncate">{tag}</span>
              </>
            ) : null}
          </p>
        </div>
      </button>

      <div className="flex flex-col gap-2.5 border-t border-line px-4 pb-4 pt-3 text-[13px] text-ink-700">
        {place.address ? (
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-visited-500" aria-hidden="true" />
            <span className="line-clamp-2">{place.address}</span>
          </p>
        ) : null}
        {hasHours(place) ? (
          <p className="flex items-start gap-2">
            <Clock className="mt-0.5 size-4 shrink-0 text-visited-500" aria-hidden="true" />
            <OpeningHours place={place} />
          </p>
        ) : null}
        {place.tags?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {place.tags.slice(0, 3).map((item) => (
              <span key={item.id} className="tag">
                {item.name}
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2 pt-1">
          <a
            href={openInMapsUrl(place)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary min-h-10 flex-1 text-xs"
          >
            <Navigation className="size-3.5" aria-hidden="true" />
            {t("place.route")}
          </a>
          <Link
            href={`/places/detail/?id=${encodeURIComponent(place.id)}`}
            className="btn btn-outline min-h-10 flex-1 text-xs"
          >
            {t("place.detailShort")}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function ExploreCards({ places, status, onSelect, onReload, focusId }) {
  const rowRef = useRef(null);

  // Coming back from a restaurant's detail: scroll the row to that restaurant's card.
  useEffect(() => {
    const row = rowRef.current;
    if (!focusId || !row) return;
    const card = row.querySelector(`#sheet-card-${CSS.escape(focusId)}`);
    if (card) row.scrollLeft = Math.max(card.offsetLeft - 16, 0);
  }, [focusId]);

  if (status === "loading") {
    return (
      <div className="px-4">
        <div className="skeleton h-60 w-[17.5rem] rounded-3xl" aria-busy="true" />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="px-4">
        <EmptyState kind="error" onRetry={onReload} />
      </div>
    );
  }
  if (places.length === 0) {
    return (
      <div className="px-4">
        <EmptyState kind="empty" />
      </div>
    );
  }
  return (
    <div
      ref={rowRef}
      className="hide-scrollbar relative flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-4"
    >
      {places.map((place) => (
        <ExploreCard key={place.id} place={place} onSelect={onSelect} />
      ))}
    </div>
  );
}

/* ── List: one wide row (photo on the left, details on the right) ── */
function PlaceRow({ place, onSelect }) {
  const { t, formatDistance, formatNumber } = useI18n();
  const distance = formatDistance(place.distanceKm);
  const tag = place.tags?.[0]?.name;

  return (
    <button
      type="button"
      onClick={() => onSelect(place.id)}
      className="relative flex w-full items-start gap-3 rounded-2xl border border-line bg-white p-2.5 text-left shadow-card transition-colors active:bg-chip"
    >
      {/* Photo */}
      <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-stone-100">
        <Photo place={place} iconClassName="size-8" />
      </div>

      {/* Status badge — top-right corner */}
      <div className="absolute right-3 top-3">
        <StatusBadge status={place.status} />
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        {/* Name — with right padding so it doesn't overlap the badge */}
        <h3 className="truncate pr-20 text-[15px] font-extrabold text-ink-900">{place.name}</h3>

        {/* Row 1: Rating · Distance */}
        <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-600">
          {place.rating != null ? (
            <>
              <span className="font-bold text-ink-900">{formatNumber(place.rating, 1)}</span>
              <Star className="size-3.5 fill-star text-star" aria-hidden="true" />
            </>
          ) : (
            <span className="text-ink-500">{t("place.notRated")}</span>
          )}
          {distance && (
            <>
              <span className="text-ink-400">·</span>
              <span className="text-[11px] font-medium text-ink-500 mt-0.5">{distance}</span>
            </>
          )}
        </p>

        {/* Row 2: Tag */}
        <div className="mt-1 flex items-center gap-1 text-xs">
          {tag ? (
            <p className="truncate text-ink-600">{tag}</p>
          ) : null}

          {place.price_level ? (
            <>
              <span className="text-ink-400">·</span>
              <span className="shrink-0 text-ink-600 text-[11px]">
                {t(`price.${place.price_level}`)}
              </span>
            </>
          ) : null}
        </div>

        {/* Row 3: Opening hours */}
        {hasHours(place) ? (
          <div className="mt-1 text-xs">
            <OpeningHours place={place} className="text-[11px]" />
          </div>
        ) : null}
      </div>
    </button>
  );
}

function ListContent({ places, status, onSelect, onReload, list }) {
  const { t } = useI18n();
  const [expandedFilter, setExpandedFilter] = useState(null); // 'category' | 'sort' | null
  const categoryLabel = t("filters.tags") === "Tag" ? "Kategori" : "Category";
  const selectedTagObj = list.tags?.find((t) => String(t.id) === String(list.selectedTagIds?.[0]));
  const pills = [
    ["all", t("status.all"), list.counts.all],
    ["wishlist", t("status.wishlistLong"), list.counts.wishlist],
    ["visited", t("status.visitedLong"), list.counts.visited],
  ];

  let body;
  if (status === "loading") {
    body = [0, 1, 2].map((key) => <div key={key} className="skeleton h-28 rounded-2xl" aria-busy="true" />);
  } else if (status === "error") {
    body = <EmptyState kind="error" onRetry={onReload} />;
  } else if (list.counts.all === 0) {
    body = <EmptyState kind="empty" />;
  } else if (places.length === 0) {
    body = (
      <div className="flex flex-col items-center px-6 py-10 text-center" role="status">
        <h2 className="text-base font-bold text-ink-900">{t("empty.filteredTitle")}</h2>
        <p className="mt-1 max-w-xs text-sm text-ink-500">{t("empty.filteredBody")}</p>
        <button type="button" onClick={list.onReset} className="btn btn-outline mt-5">
          <RotateCcw className="size-4" aria-hidden="true" />
          {t("filters.reset")}
        </button>
      </div>
    );
  } else {
    body = places.map((place) => <PlaceRow key={place.id} place={place} onSelect={onSelect} />);
  }

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-10 bg-cream">
        <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto px-4 pb-2.5 pt-1">
          {/* Quick Status Pills: Semua, Ingin dikunjungi, Sudah dikunjungi */}
          {pills.map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              aria-pressed={list.activeStatus === key}
              onClick={() => list.onStatusChange(key)}
              className="chip h-8 shrink-0"
            >
              {label}
              <span className="font-normal text-ink-500">{count}</span>
            </button>
          ))}

          <div className="h-4 w-px shrink-0 bg-line" aria-hidden="true" />

          {/* Category Button */}
          <button
            type="button"
            onClick={() => setExpandedFilter((prev) => (prev === "category" ? null : "category"))}
            aria-expanded={expandedFilter === "category"}
            className={`h-8 shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${
              list.selectedTagIds?.length > 0 || expandedFilter === "category"
                ? "border-primary-700 bg-primary-50 text-primary-800"
                : "border-line bg-white text-ink-800 hover:bg-chip"
            }`}
          >
            <span className="truncate max-w-[120px]">
              {selectedTagObj ? selectedTagObj.name : categoryLabel}
            </span>
            <ChevronDown
              className={`size-3.5 transition-transform duration-200 ${
                expandedFilter === "category"
                  ? "rotate-180 text-primary-800"
                  : list.selectedTagIds?.length > 0
                  ? "text-primary-800"
                  : "text-ink-600"
              }`}
              aria-hidden="true"
            />
          </button>

          {/* Sort Button */}
          <button
            type="button"
            onClick={() => setExpandedFilter((prev) => (prev === "sort" ? null : "sort"))}
            aria-expanded={expandedFilter === "sort"}
            className={`h-8 shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${
              expandedFilter === "sort" || list.sortBy !== "newest"
                ? "border-primary-700 bg-primary-50 text-primary-800"
                : "border-line bg-white text-ink-800 hover:bg-chip"
            }`}
          >
            <span>{t(`sort.${list.sortBy}`)}</span>
            <ChevronDown
              className={`size-3.5 transition-transform duration-200 ${
                expandedFilter === "sort"
                  ? "rotate-180 text-primary-800"
                  : list.sortBy !== "newest"
                  ? "text-primary-800"
                  : "text-ink-600"
              }`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Expandable Filter Card: Category */}
        {expandedFilter === "category" && (
          <div className="px-4 pb-2.5">
            <div className="rounded-2xl border border-line bg-white p-3.5 shadow-sm flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-900">{categoryLabel}</span>
                <div className="flex items-center gap-2">
                  {list.selectedTagIds?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => list.onTagChange("")}
                      className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                    >
                      {t("filters.reset")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedFilter(null)}
                    className="p-1 rounded-full text-ink-400 hover:bg-chip transition-colors"
                    aria-label="Tutup"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>

              {list.tags?.length === 0 ? (
                <p className="text-xs text-ink-500 py-1">{t("filters.noTags")}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      list.onTagChange("");
                      setExpandedFilter(null);
                    }}
                    className={`chip h-8 text-xs ${
                      !list.selectedTagIds?.length
                        ? "border-primary-700 bg-primary-50 text-primary-800 font-bold"
                        : "border-line bg-white text-ink-700 hover:bg-chip"
                    }`}
                  >
                    Semua
                  </button>
                  {list.tags?.map((tag) => {
                    const isSelected =
                      list.selectedTagIds?.includes(tag.id) ||
                      String(list.selectedTagIds?.[0]) === String(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          list.onTagChange(isSelected ? "" : tag.id);
                          setExpandedFilter(null);
                        }}
                        className={`chip h-8 text-xs ${
                          isSelected
                            ? "border-primary-700 bg-primary-50 text-primary-800 font-bold"
                            : "border-line bg-white text-ink-700 hover:bg-chip"
                        }`}
                      >
                        {tag.name}
                        {tag.count != null && (
                          <span className="font-normal text-ink-400 text-[11px]">
                            {tag.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expandable Filter Card: Sort */}
        {expandedFilter === "sort" && (
          <div className="px-4 pb-2.5">
            <div className="rounded-2xl border border-line bg-white p-3.5 shadow-sm flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-900">{t("filters.sort")}</span>
                <button
                  type="button"
                  onClick={() => setExpandedFilter(null)}
                  className="p-1 rounded-full text-ink-400 hover:bg-chip transition-colors"
                  aria-label="Tutup"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {["newest", "rating", "nearest", "name", "oldest"].map((sortKey) => {
                  const isSelected = list.sortBy === sortKey;
                  return (
                    <button
                      key={sortKey}
                      type="button"
                      onClick={() => {
                        list.onSortChange({ target: { value: sortKey } });
                        setExpandedFilter(null);
                      }}
                      className={`chip h-8 text-xs ${
                        isSelected
                          ? "border-primary-700 bg-primary-50 text-primary-800 font-bold"
                          : "border-line bg-white text-ink-700 hover:bg-chip"
                      }`}
                    >
                      {t(`sort.${sortKey}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 px-4">{body}</div>
    </div>
  );
}

/* ── Detail of the selected restaurant ──────────────────────────── */
function PlaceDetail({ place }) {
  const { t, formatNumber, formatDate } = useI18n();
  const { openEdit } = usePlaces();

  return (
    <div className="pb-10">
      <div className="h-44 bg-stone-100">
        <Photo place={place} alt={place.name} iconClassName="size-12" />
      </div>

      <div className="px-4 pt-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <StatusBadge status={place.status} long />
          {place.rating != null ? (
            <span className="flex items-center gap-1.5">
              <span className="font-bold text-ink-900">{formatNumber(place.rating, 1)}</span>
              <StarRating value={place.rating} size="size-3.5" />
            </span>
          ) : null}
          {place.price_level ? <span className="font-semibold text-ink-700">{t(`price.${place.price_level}`)}</span> : null}
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <a
            href={openInMapsUrl(place)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary min-h-12 flex-1"
          >
            <Navigation className="size-4" aria-hidden="true" />
            {t("place.route")}
          </a>
          <Link
            href={`/places/detail/?id=${encodeURIComponent(place.id)}`}
            className="btn btn-outline min-h-12 flex-1"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
            {t("place.detailShort")}
          </Link>
          <button
            type="button"
            onClick={() => openEdit(place.id)}
            className="btn btn-outline size-12 shrink-0 px-0"
            aria-label={t("place.edit")}
            title={t("place.edit")}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3.5 text-sm text-ink-700">
          {place.address ? (
            <p className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-visited-500" aria-hidden="true" />
              <span className="leading-relaxed">{place.address}</span>
            </p>
          ) : null}
          {hasHours(place) ? (
            <p className="flex items-start gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-visited-500" aria-hidden="true" />
              <OpeningHours place={place} />
            </p>
          ) : null}
          {place.price_level ? (
            <p className="flex items-start gap-3">
              <Wallet className="mt-0.5 size-5 shrink-0 text-visited-500" aria-hidden="true" />
              <span className="font-semibold text-ink-900">
                {t("price.perPerson", { price: t(`price.full.${place.price_level}`) })}
              </span>
            </p>
          ) : null}
          <p className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-visited-500" aria-hidden="true" />
            <span>
              {place.status === "visited" && place.visited_at
                ? t("place.visitedOnDate", { date: formatDate(place.visited_at) })
                : t("place.addedOnDate", { date: formatDate(place.created_at) })}
            </span>
          </p>
        </div>

        {place.tags?.length ? (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {place.tags.map((item) => (
              <span key={item.id} className="rounded-full border border-line bg-chip px-3 py-1 text-[11px] font-medium text-ink-700">
                {item.name}
              </span>
            ))}
          </div>
        ) : null}

        {place.notes ? (
          <div className="mt-5 rounded-2xl border border-line bg-white p-3.5">
            <h3 className="mb-1.5 text-xs font-bold text-ink-800">{t("place.notes")}</h3>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-600">{place.notes}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The phone's map sheet. Without a selection it shows either
 *   - mode "explore": a carousel of restaurant cards (pull it up to see more of each card), or
 *   - mode "list": the whole list as wide rows with status chips, sort and filter, opened tall right away.
 * With a selection it shows that restaurant's detail, opening half-way so the map stays visible, with a close
 * button that brings back the carousel or the list. `list` carries the List tab's filter state and handlers.
 */
export default function MobilePlaceSheets({ mode = "explore", places, selected, status, onSelect, onClose, onReload, onVisibleChange, list }) {
  const { t } = useI18n();
  const listMode = mode === "list";
  const restingSnap = listMode ? "full" : "half";
  const [snap, setSnap] = useState(restingSnap);
  const [focusId, setFocusId] = useState(null);

  // A different restaurant was opened or closed: reposition the sheet. Done while rendering (React's "adjust
  // state on prop change" pattern) keyed by id, so refreshing the same restaurant's data does not reset it.
  const selectedId = selected?.id ?? null;
  const [trackedId, setTrackedId] = useState(selectedId);
  if (selectedId !== trackedId) {
    setTrackedId(selectedId);
    setSnap(selectedId ? "half" : restingSnap);
    if (selectedId) setFocusId(selectedId);
  }

  const tag = selected?.tags?.[0]?.name;
  let header;
  if (selected) {
    header = (
      <div className="flex w-full items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-extrabold leading-tight text-ink-900">{selected.name}</h2>
          <p className="truncate text-xs text-ink-500">{[tag, shortArea(selected.address)].filter(Boolean).join(" · ")}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("sheet.closeDetail")}
          title={t("sheet.closeDetail")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-ink-700 shadow-card hover:bg-chip"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
    );
  } else {
    header = (
      <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
        <MapPin className="size-4 shrink-0 text-primary-700" aria-hidden="true" />
        <span className="truncate">
          {status === "loading" ? t("app.loading") : t("home.restaurantsShown", { count: places.length })}
        </span>
      </p>
    );
  }

  let content;
  if (selected) content = <PlaceDetail key={selected.id} place={selected} />;
  else if (listMode) content = <ListContent places={places} status={status} onSelect={onSelect} onReload={onReload} list={list} />;
  else content = <ExploreCards places={places} status={status} onSelect={onSelect} onReload={onReload} focusId={focusId} />;

  return (
    <BottomSheet
      snap={snap}
      onSnapChange={setSnap}
      snaps={selected ? DETAIL_SNAPS : EXPLORE_SNAPS}
      halfRatio={0.5}
      // Cover the search bar when fully open while leaving a small top space
      topGap={10}
      header={header}
      label={selected ? selected.name : listMode ? t("list.title") : t("home.nearbyTitle")}
      horizontal={!selected}
      onVisibleChange={onVisibleChange}
    >
      {content}
    </BottomSheet>
  );
}