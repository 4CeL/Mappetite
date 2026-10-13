"use client";

import dynamic from "next/dynamic";

// Leaflet needs `window`, so the maps are client-only (static export prerenders pages).
function MapLoading() {
  return <div className="skeleton h-full w-full rounded-none" aria-hidden="true" />;
}

export const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: MapLoading });
export const LocationPicker = dynamic(() => import("./LocationPicker"), { ssr: false, loading: MapLoading });
