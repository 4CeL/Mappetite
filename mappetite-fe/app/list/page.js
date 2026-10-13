"use client";

import { useId } from "react";

import LanguageToggle from "@/components/LanguageToggle";
import EmptyState from "@/components/places/EmptyState";
import PlaceCard, { PlaceCardSkeleton } from "@/components/places/PlaceCard";
import PlaceFilters from "@/components/places/PlaceFilters";
import useFilteredPlaces from "@/components/places/useFilteredPlaces";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { SORT_OPTIONS } from "@/lib/filters";
import { useI18n } from "@/lib/i18n";

export default function ListPage() {
  const { t } = useI18n();
  const { status, places, reload, filters, setFilters, geo, locate } = usePlaces();
  const { visible, counts } = useFilteredPlaces();
  const sortId = useId();

  const onSort = (event) => {
    const sort = event.target.value;
    setFilters((previous) => ({ ...previous, sort }));
    if (sort === "nearest" && !geo.coords) locate();
  };

  let content;
  if (status === "loading") {
    content = (
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((key) => (
          <PlaceCardSkeleton key={key} compact />
        ))}
      </div>
    );
  } else if (status === "error") {
    content = <EmptyState kind="error" onRetry={reload} />;
  } else if (places.length === 0) {
    content = <EmptyState kind="empty" />;
  } else if (visible.length === 0) {
    content = <EmptyState kind="filtered" />;
  } else {
    content = (
      <ul className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {visible.map((place) => (
          <li key={place.id}>
            <PlaceCard place={place} compact href={`/places/detail/?id=${encodeURIComponent(place.id)}`} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-6 lg:px-6 lg:pt-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[22px] font-bold text-ink-900 lg:text-[26px]">{t("nav.list")}</h1>
        <LanguageToggle className="lg:hidden" />
      </div>

      <div className="mt-4 lg:max-w-2xl">
        <PlaceFilters counts={counts} />
      </div>

      <div className="mb-3 mt-5 flex items-center justify-between gap-3">
        <p className="text-xs text-ink-500" aria-live="polite">
          {t("home.restaurantsShown", { count: visible.length })}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor={sortId} className="text-xs text-ink-500">
            {t("filters.sort")}
          </label>
          <select
            id={sortId}
            value={filters.sort}
            onChange={onSort}
            className="min-h-9 rounded-lg border border-line bg-white px-2 text-xs font-bold text-primary-800"
          >
            {SORT_OPTIONS.map((sort) => (
              <option key={sort} value={sort}>
                {t(`sort.${sort}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {content}
    </div>
  );
}
