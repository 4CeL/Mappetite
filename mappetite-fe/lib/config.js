// Public runtime configuration. NEXT_PUBLIC_* values are inlined at build time.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export const MAP_TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const MAP_TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Jakarta, used when there are no places and no user location yet.
export const DEFAULT_CENTER = [-6.2, 106.8166];
export const DEFAULT_ZOOM = 12;

// Limits mirrored from the backend validation.
export const LIMITS = {
  name: 120,
  address: 300,
  notes: 500,
  tag: 30,
  tagsPerPlace: 10,
  passwordMin: 8,
};
