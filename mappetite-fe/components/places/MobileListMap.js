"use client";

import { useCallback, useEffect, useState } from "react";

import TopSearchBar from "@/components/layout/TopSearchBar";
import { MapView } from "@/components/map";
import MobilePlaceSheets from "@/components/places/MobilePlaceSheets";
import { usePlaces } from "@/components/providers/PlacesProvider";

const noPopup = () => null;

/**
 * The List tab on a phone: the same map as the Explore tab, with the whole list in a sheet on top of it
 * (opened tall right away). Tapping a restaurant flies the map to it and shows its detail sheet; closing that
 * brings the list back. Filters and search live in the List page, which passes them in.
 */
export default function MobileListMap({ places, status, onReload, searchQuery, onSearchChange, list }) {
  const { selectedId, setSelectedId, geo, locate } = usePlaces();
  const [sheetVisible, setSheetVisible] = useState(0);
  const selected = selectedId ? places.find((place) => place.id === selectedId) ?? null : null;

  // The selection is shared with the Explore tab; keep it from leaking across tabs in either direction.
  useEffect(() => {
    setSelectedId(null);
    return () => setSelectedId(null);
  }, [setSelectedId]);

  const onSelect = useCallback((id) => setSelectedId(id), [setSelectedId]);

  return (
    <div className="fixed inset-x-0 top-0 bottom-[var(--mp-tabbar-h)] overflow-hidden bg-stone-200">
      <div className="absolute inset-0 z-0">
        <MapView
          places={places}
          selectedId={selected?.id ?? null}
          onSelect={onSelect}
          geo={geo}
          onLocate={locate}
          renderPopup={noPopup}
          controlsClassName="max-lg:bottom-[calc(var(--mp-sheet-visible,5rem)_+_0.75rem)] right-4 w-fit"
          attributionOffset="var(--mp-sheet-visible, 0px)"
          bottomInset={sheetVisible}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-4 top-4 z-20">
        <div className="pointer-events-auto">
          <TopSearchBar
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            className="rounded-full shadow-lg border-0 bg-white"
          />
        </div>
      </div>

      <MobilePlaceSheets
        mode="list"
        places={places}
        selected={selected}
        status={status}
        onSelect={onSelect}
        onClose={() => setSelectedId(null)}
        onReload={onReload}
        onVisibleChange={setSheetVisible}
        list={list}
      />
    </div>
  );
}
