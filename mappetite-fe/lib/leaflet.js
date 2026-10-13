"use client";

// Leaflet must be exposed as a mutable global before `leaflet.markercluster`
// is evaluated: the plugin attaches `L.MarkerClusterGroup` to `window.L`.
// Import this module before importing "leaflet.markercluster".
import L from "leaflet";

if (typeof window !== "undefined") {
  window.L = L;
}

export default L;
