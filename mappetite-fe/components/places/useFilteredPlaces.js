"use client";

import { useMemo } from "react";

import { usePlaces } from "@/components/providers/PlacesProvider";
import { filterByStatus, filterPlaces, sortPlaces } from "@/lib/filters";

/** Applies the shared filters. Status counts ignore the status filter itself. */
export default function useFilteredPlaces() {
  const { places, filters } = usePlaces();

  return useMemo(() => {
    const base = filterPlaces(places, filters);
    const visible = sortPlaces(filterByStatus(base, filters.status), filters.sort);
    const counts = {
      all: base.length,
      wishlist: base.filter((place) => place.status === "wishlist").length,
      visited: base.filter((place) => place.status === "visited").length,
    };
    const totals = {
      all: places.length,
      visited: places.filter((place) => place.status === "visited").length,
    };
    return { visible, counts, totals };
  }, [places, filters]);
}
