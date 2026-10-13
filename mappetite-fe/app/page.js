"use client";

import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect } from "react";

import { MapView } from "@/components/map";
import EmptyState from "@/components/places/EmptyState";
import PlaceActions from "@/components/places/PlaceActions";
import PlaceCard, { PlaceCardSkeleton } from "@/components/places/PlaceCard";
import PlaceFilters from "@/components/places/PlaceFilters";
import PlacePopup from "@/components/places/PlacePopup";
import PlaceThumb from "@/components/places/PlaceThumb";
import { RatingPill } from "@/components/places/Rating";
import StatusBadge from "@/components/places/StatusBadge";
import useFilteredPlaces from "@/components/places/useFilteredPlaces";
import { usePlaces } from "@/components/providers/PlacesProvider";
import { shortArea } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

function PanelList({ visible, selectedId, onSelect }) {
  const { status, places, reload } = usePlaces();

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-3">
        <PlaceCardSkeleton />
        <PlaceCardSkeleton />
        <PlaceCardSkeleton />
      </div>
    );
  }
  if (status === "error") return <EmptyState kind="error" onRetry={reload} />;
  if (places.length === 0) return <EmptyState kind="empty" />;
  if (visible.length === 0) return <EmptyState kind="filtered" />;

  return (
    <ul className="flex flex-col gap-3">
      {visible.map((place) => (
        <li key={place.id} id={`place-card-${place.id}`}>
          <PlaceCard place={place} selected={place.id === selectedId} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}

function MobileSheet({ selected, count }) {
  const { t, formatDistance } = useI18n();
  const { status, places } = usePlaces();

  return (
    <div className="absolute inset-x-0 bottom-0 z-[950] rounded-t-3xl bg-white px-5 pb-5 pt-3 shadow-sheet lg:hidden">
      <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
      {selected ? (
        <div className="flex flex-col gap-4" aria-live="polite">
          <div className="flex items-center gap-4">
            <PlaceThumb place={selected} className="size-[4.5rem]" iconClassName="size-8" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-bold text-ink-900">{selected.name}</h2>
              <p className="truncate text-xs text-ink-500">
                {[shortArea(selected.address), formatDistance(selected.distanceKm)].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={selected.status} />
                <RatingPill value={selected.rating} />
              </div>
            </div>
          </div>
          <PlaceActions place={selected} />
        </div>
      ) : status === "ready" && places.length === 0 ? (
        <EmptyState kind="empty" className="py-2" />
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <MapPin className="size-4 text-primary-700" aria-hidden="true" />
            {status === "loading" ? t("app.loading") : t("home.restaurantsShown", { count })}
          </p>
          <Link href="/list/" className="btn btn-sm btn-outline">
            {t("nav.list")}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { t } = useI18n();
  const { selectedId, setSelectedId, geo, locate } = usePlaces();
  const { visible, counts, totals } = useFilteredPlaces();
  const selected = selectedId ? visible.find((place) => place.id === selectedId) ?? null : null;

  const onSelect = useCallback((id) => setSelectedId(id), [setSelectedId]);
  const renderPopup = useCallback(
    (place) => <PlacePopup place={place} onClose={() => setSelectedId(null)} />,
    [setSelectedId],
  );

  // Keep the selected card visible in the desktop list when a marker is clicked.
  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`place-card-${selectedId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  return (
    <div className="relative h-[calc(100dvh-4.5rem)] lg:grid lg:grid-cols-[26rem_1fr] lg:gap-6 lg:p-6">
      <section className="hidden min-h-0 flex-col lg:flex" aria-labelledby="home-title">
        <h1 id="home-title" className="text-[26px] font-bold leading-tight text-ink-900">
          {t("home.title")}
        </h1>
        <p className="mt-1 text-[13px] text-ink-500">{t("home.summary", { total: totals.all, visited: totals.visited })}</p>
        <div className="mt-5">
          <PlaceFilters counts={counts} />
        </div>
        {/* `relative` keeps absolutely positioned descendants (sr-only labels) inside the scroller's clip. */}
        <div className="relative -mx-2 mt-4 min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-1">
          <PanelList visible={visible} selectedId={selected?.id ?? null} onSelect={onSelect} />
        </div>
        {visible.length > 0 ? (
          <Link
            href="/list/"
            className="mt-3 inline-flex items-center justify-center gap-1.5 self-center text-[13px] font-bold text-primary-800 hover:underline"
          >
            {t("home.seeAll")}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </section>

      <section
        className="absolute inset-0 lg:relative lg:inset-auto lg:min-h-0 lg:overflow-hidden lg:rounded-[1.25rem] lg:border lg:border-line"
        aria-label={t("map.label")}
      >
        <MapView
          places={visible}
          selectedId={selected?.id ?? null}
          onSelect={onSelect}
          geo={geo}
          onLocate={locate}
          renderPopup={renderPopup}
          controlsClassName={selected ? "bottom-60 lg:bottom-6" : "bottom-28 lg:bottom-6"}
          attributionOffset={selected ? "11.75rem" : "5.25rem"}
        />
      </section>

      <div className="absolute inset-x-0 top-0 z-[950] px-4 pt-[max(1rem,env(safe-area-inset-top))] lg:hidden">
        <h1 className="sr-only">{t("home.title")}</h1>
        <PlaceFilters variant="floating" counts={counts} />
      </div>

      <MobileSheet selected={selected} count={visible.length} />
    </div>
  );
}
