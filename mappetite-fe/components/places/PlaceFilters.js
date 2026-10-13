"use client";

import { Search, SlidersHorizontal, Star } from "lucide-react";
import { useState } from "react";

import Modal from "@/components/Modal";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { activeFilterCount, SORT_OPTIONS } from "@/lib/filters";
import { useI18n } from "@/lib/i18n";

const PRICES = [1, 2, 3, 4];
const MIN_RATINGS = [null, 3, 4, 4.5];
const QUICK_TAG_COUNT = 3;

function toggle(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function FilterSheet({ open, onClose }) {
  const { t, formatNumber } = useI18n();
  const { filters, setFilters, resetFilters, tags, geo, locate } = usePlaces();
  const update = (patch) => setFilters((previous) => ({ ...previous, ...patch }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("filters.title")}
      size="sm"
      variant="sheet"
      footer={
        <div className="flex justify-between gap-3">
          <button type="button" className="btn btn-ghost" onClick={resetFilters}>
            {t("filters.reset")}
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {t("filters.apply")}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <fieldset>
          <legend className="field-label">{t("filters.sort")}</legend>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((sort) => (
              <button
                key={sort}
                type="button"
                className="chip"
                aria-pressed={filters.sort === sort}
                onClick={() => {
                  update({ sort });
                  if (sort === "nearest" && !geo.coords) locate();
                }}
              >
                {t(`sort.${sort}`)}
              </button>
            ))}
          </div>
          {filters.sort === "nearest" && geo.status === "denied" ? (
            <p className="field-hint text-danger-700">{t("map.locationDenied")}</p>
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="field-label">{t("filters.tags")}</legend>
          {tags.length === 0 ? (
            <p className="text-xs text-ink-500">{t("filters.noTags")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="chip"
                  aria-pressed={filters.tagIds.includes(tag.id)}
                  onClick={() => update({ tagIds: toggle(filters.tagIds, tag.id) })}
                >
                  {tag.name}
                  <span className="text-ink-400">{tag.count}</span>
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="field-label">{t("filters.price")}</legend>
          <div className="flex gap-2">
            {PRICES.map((price) => (
              <button
                key={price}
                type="button"
                className="chip min-w-14 justify-center"
                aria-pressed={filters.prices.includes(price)}
                onClick={() => update({ prices: toggle(filters.prices, price) })}
              >
                {"$".repeat(price)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="field-label">{t("filters.minRating")}</legend>
          <div className="flex flex-wrap gap-2">
            {MIN_RATINGS.map((rating) => (
              <button
                key={rating ?? "any"}
                type="button"
                className="chip"
                aria-pressed={filters.minRating === rating}
                onClick={() => update({ minRating: rating })}
              >
                {rating ? (
                  <>
                    <Star className="size-3.5 text-star" fill="currentColor" strokeWidth={0} aria-hidden="true" />
                    {formatNumber(rating, rating % 1 ? 1 : 0)}+
                  </>
                ) : (
                  t("filters.anyRating")
                )}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}

/**
 * Search + filters shared by the map panel, the mobile map overlay and the list page.
 * `variant="floating"` is the compact overlay on the mobile map.
 */
export default function PlaceFilters({ counts, variant = "panel" }) {
  const { t } = useI18n();
  const { filters, setFilters, tags, geo, locate } = usePlaces();
  const [sheetOpen, setSheetOpen] = useState(false);
  const update = (patch) => setFilters((previous) => ({ ...previous, ...patch }));
  const badge = activeFilterCount(filters);
  const floating = variant === "floating";

  const statusOptions = [
    { value: "all", label: t("status.all") },
    { value: "wishlist", label: t("status.wishlist") },
    { value: "visited", label: t("status.visited") },
  ];

  const toggleNearest = () => {
    const nearest = filters.sort === "nearest";
    update({ sort: nearest ? "newest" : "nearest" });
    if (!nearest && !geo.coords) locate();
  };

  const quickTags = tags.slice(0, QUICK_TAG_COUNT);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <label className={`relative flex-1 ${floating ? "drop-shadow-sm" : ""}`}>
          <span className="sr-only">{t("search.label")}</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-500" aria-hidden="true" />
          <input
            type="search"
            value={filters.q}
            onChange={(event) => update({ q: event.target.value })}
            placeholder={floating ? t("search.placeholderShort") : t("search.placeholder")}
            className={`input pl-11 ${floating ? "rounded-full border-transparent shadow-card" : "min-h-12"}`}
            enterKeyHint="search"
          />
        </label>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`relative flex shrink-0 items-center justify-center bg-primary-700 text-white hover:bg-primary-800 ${
            floating ? "size-11 rounded-full shadow-card" : "size-12 rounded-xl"
          }`}
          aria-label={t("filters.open")}
          aria-haspopup="dialog"
        >
          <SlidersHorizontal className="size-5" aria-hidden="true" />
          {badge > 0 ? (
            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-brand-orange text-[10px] font-bold text-white">
              {badge}
            </span>
          ) : null}
        </button>
      </div>

      {floating ? (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label={t("status.label")}>
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filters.status === option.value}
              onClick={() => update({ status: option.value })}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold shadow-card ${
                filters.status === option.value ? "bg-ink-900 text-white" : "bg-white text-ink-700"
              }`}
            >
              {option.value !== "all" ? (
                <span
                  className={`size-2 rounded-full ${option.value === "visited" ? "bg-visited-500" : "bg-primary-700"}`}
                  aria-hidden="true"
                />
              ) : null}
              {option.label}
            </button>
          ))}
          {quickTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              aria-pressed={filters.tagIds.includes(tag.id)}
              onClick={() => update({ tagIds: toggle(filters.tagIds, tag.id) })}
              className={`inline-flex min-h-9 shrink-0 items-center rounded-full px-4 text-xs font-semibold shadow-card ${
                filters.tagIds.includes(tag.id) ? "bg-primary-700 text-white" : "bg-white text-ink-700"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="segmented" role="group" aria-label={t("status.label")}>
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={filters.status === option.value}
                onClick={() => update({ status: option.value })}
              >
                {option.label}
                {counts ? <span className="ml-1 font-normal text-ink-500">· {counts[option.value]}</span> : null}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="chip"
              aria-pressed={filters.minRating === 4}
              onClick={() => update({ minRating: filters.minRating === 4 ? null : 4 })}
            >
              <Star className="size-3.5 text-star" fill="currentColor" strokeWidth={0} aria-hidden="true" />
              {t("filters.rating4")}
            </button>
            <button type="button" className="chip" aria-pressed={filters.sort === "nearest"} onClick={toggleNearest}>
              {t("filters.nearest")}
            </button>
            {quickTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="chip"
                aria-pressed={filters.tagIds.includes(tag.id)}
                onClick={() => update({ tagIds: toggle(filters.tagIds, tag.id) })}
              >
                {tag.name}
              </button>
            ))}
          </div>
          {filters.sort === "nearest" && geo.status === "denied" ? (
            <p className="text-xs text-danger-700" role="status">
              {t("map.locationDenied")}
            </p>
          ) : null}
        </>
      )}

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
