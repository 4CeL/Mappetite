import { distanceKm } from "./format";

export const DEFAULT_FILTERS = {
  status: "all", // all | wishlist | visited
  q: "",
  tagIds: [],
  prices: [],
  minRating: null,
  sort: "newest", // newest | oldest | name | rating | nearest
};

export const SORT_OPTIONS = ["newest", "oldest", "name", "rating", "nearest"];

export function activeFilterCount(filters) {
  return (
    filters.tagIds.length +
    filters.prices.length +
    (filters.minRating ? 1 : 0) +
    (filters.sort !== DEFAULT_FILTERS.sort ? 1 : 0)
  );
}

function matchesQuery(place, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [place.name, place.original_name, place.address, place.notes, ...place.tags.map((tag) => tag.name)]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(needle));
}

/** Attach `distanceKm` (when the user location is known) without mutating the input. */
export function withDistance(places, location) {
  return places.map((place) => ({ ...place, distanceKm: location ? distanceKm(location, place) : null }));
}

/** Filters everything except status (status counts are shown on the segmented control). */
export function filterPlaces(places, filters) {
  const q = filters.q.trim();
  return places.filter(
    (place) =>
      matchesQuery(place, q) &&
      (filters.tagIds.length === 0 || place.tags.some((tag) => filters.tagIds.includes(tag.id))) &&
      (filters.prices.length === 0 || filters.prices.includes(place.price_level)) &&
      (!filters.minRating || (place.rating != null && place.rating >= filters.minRating)),
  );
}

export function filterByStatus(places, status) {
  return status === "all" ? places : places.filter((place) => place.status === status);
}

export function sortPlaces(places, sort) {
  const sorted = [...places];
  const byName = (a, b) => a.name.localeCompare(b.name);
  switch (sort) {
    case "oldest":
      return sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
    case "name":
      return sorted.sort(byName);
    case "rating":
      return sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || byName(a, b));
    case "nearest":
      return sorted.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    default:
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

/** Unique tags across the user's places, most used first. */
export function collectTags(places) {
  const counts = new Map();
  places.forEach((place) =>
    place.tags.forEach((tag) => {
      const entry = counts.get(tag.id) || { ...tag, count: 0 };
      entry.count += 1;
      counts.set(tag.id, entry);
    }),
  );
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
