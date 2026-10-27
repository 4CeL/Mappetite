"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

import L from "@/lib/leaflet";
import "leaflet.markercluster";

import { LocateFixed, Loader2, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";

import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_TILE_ATTRIBUTION, MAP_TILE_URL } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import { clusterIcon, placeIcon, userLocationIcon } from "./icons";

const LABEL_MIN_ZOOM = 14;

/**
 * Main map: clustered markers, selection, user location and an anchored popup.
 * Overlays (popup, controls, legend) are siblings of the Leaflet container so
 * their clicks never reach the map.
 */
export default function MapView({
  places,
  selectedId,
  onSelect,
  geo,
  onLocate,
  renderPopup,
  className = "",
  controlsClassName = "bottom-28 lg:bottom-6",
  // Mobile only: lifts Leaflet's bottom controls (OSM attribution) above overlays like the bottom sheet.
  attributionOffset = "0px",
}) {
  const { t } = useI18n();
  const [map, setMap] = useState(null);
  const [, setViewVersion] = useState(0);
  const groupRef = useRef(null);
  const markersRef = useRef(new Map());
  const selectedRef = useRef(null);
  const fittedRef = useRef(false);
  const pendingLocateRef = useRef(false);

  // Cluster group lifecycle + label visibility + popup repositioning on view changes.
  useEffect(() => {
    if (!map) return undefined;
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: clusterIcon,
    });
    map.addLayer(group);
    groupRef.current = group;

    const container = map.getContainer();
    const syncLabels = () => container.classList.toggle("mp-labels-hidden", map.getZoom() < LABEL_MIN_ZOOM);
    const onView = () => {
      syncLabels();
      setViewVersion((version) => version + 1);
    };
    const onMapClick = () => onSelect(null);
    map.on("zoomend moveend move resize", onView);
    group.on("animationend", onView);
    map.on("click", onMapClick);
    syncLabels();

    return () => {
      map.off("zoomend moveend move resize", onView);
      map.off("click", onMapClick);
      map.removeLayer(group);
      groupRef.current = null;
      markersRef.current = new Map();
      selectedRef.current = null;
    };
  }, [map, onSelect]);

  // Rebuild markers when the visible places change.
  useEffect(() => {
    const group = groupRef.current;
    if (!map || !group) return;
    group.clearLayers();
    const markers = new Map();
    places.forEach((place) => {
      const marker = L.marker([place.latitude, place.longitude], {
        icon: placeIcon(place, false),
        title: t("place.markerLabel", { name: place.name, status: t(`status.${place.status}Long`) }),
        keyboard: true,
        riseOnHover: true,
      });
      marker.on("click", () => onSelect(place.id));
      markers.set(place.id, { marker, place });
    });
    group.addLayers([...markers.values()].map((entry) => entry.marker));
    markersRef.current = markers;
    selectedRef.current = null;

    if (!fittedRef.current && places.length > 0) {
      fittedRef.current = true;
      const bounds = L.latLngBounds(places.map((place) => [place.latitude, place.longitude]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: false });
    }
  }, [map, places, onSelect, t]);

  // Highlight the selected marker and bring it into view.
  useEffect(() => {
    const group = groupRef.current;
    if (!map || !group) return;
    const previous = selectedRef.current && markersRef.current.get(selectedRef.current);
    if (previous) {
      previous.marker.setIcon(placeIcon(previous.place, false));
      previous.marker.setZIndexOffset(0);
    }
    const next = selectedId && markersRef.current.get(selectedId);
    selectedRef.current = next ? selectedId : null;
    if (!next) return;
    next.marker.setIcon(placeIcon(next.place, true));
    next.marker.setZIndexOffset(1000);
    group.zoomToShowLayer(next.marker, () => {
      map.panInside(next.marker.getLatLng(), { paddingTopLeft: [40, 260], paddingBottomRight: [40, 40] });
    });
  }, [map, selectedId, places]);

  const coords = geo?.coords ?? null;

  // User location dot (and fly there when the user asked for it).
  useEffect(() => {
    if (!map || !coords) return undefined;
    const latLng = [coords.latitude, coords.longitude];
    const marker = L.marker(latLng, {
      icon: userLocationIcon(),
      keyboard: false,
      interactive: false,
      zIndexOffset: -100,
    }).addTo(map);
    if (pendingLocateRef.current) {
      pendingLocateRef.current = false;
      map.flyTo(latLng, Math.max(map.getZoom(), 15), { duration: 0.8 });
    }
    return () => marker.remove();
  }, [map, coords]);

  const handleLocate = useCallback(() => {
    if (coords && map) {
      map.flyTo([coords.latitude, coords.longitude], Math.max(map.getZoom(), 15), { duration: 0.8 });
      return;
    }
    pendingLocateRef.current = true;
    onLocate?.();
  }, [coords, map, onLocate]);

  const selectedPlace = selectedId ? places.find((place) => place.id === selectedId) : null;
  let popupPoint = null;
  if (map && selectedPlace && renderPopup) {
    const point = map.latLngToContainerPoint([selectedPlace.latitude, selectedPlace.longitude]);
    const size = map.getSize();
    if (point.x >= 0 && point.y >= 0 && point.x <= size.x && point.y <= size.y) popupPoint = point;
  }

  return (
    <div className={`mp-map relative h-full w-full ${className}`} style={{ "--mp-attr-bottom": attributionOffset }}>
      <MapContainer
        ref={setMap}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="h-full w-full"
        aria-label={t("map.label")}
      >
        <TileLayer url={MAP_TILE_URL} attribution={MAP_TILE_ATTRIBUTION} maxZoom={19} />
      </MapContainer>

      {popupPoint ? (
        <div
          className="pointer-events-none absolute z-[900] hidden lg:block"
          style={{ left: popupPoint.x, top: popupPoint.y, transform: "translate(-50%, calc(-100% - 70px))" }}
        >
          <div className="pointer-events-auto">{renderPopup(selectedPlace)}</div>
        </div>
      ) : null}

      <div className={`absolute right-3 z-[900] flex flex-col gap-3 transition-[bottom] lg:right-4 ${controlsClassName}`}>
        <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-card">
          <button
            type="button"
            className="flex size-11 items-center justify-center text-ink-700 hover:bg-chip"
            onClick={() => map?.zoomIn()}
            aria-label={t("map.zoomIn")}
          >
            <Plus className="size-5" aria-hidden="true" />
          </button>
          <span className="mx-2 h-px bg-line" aria-hidden="true" />
          <button
            type="button"
            className="flex size-11 items-center justify-center text-ink-700 hover:bg-chip"
            onClick={() => map?.zoomOut()}
            aria-label={t("map.zoomOut")}
          >
            <Minus className="size-5" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-xl bg-white text-primary-700 shadow-card hover:bg-chip"
          onClick={handleLocate}
          aria-label={geo?.status === "locating" ? t("map.locating") : t("map.locate")}
        >
          {geo?.status === "locating" ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <LocateFixed className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="absolute bottom-6 left-4 z-[900] hidden items-center gap-4 rounded-full bg-white px-4 py-2 text-xs text-ink-700 shadow-card lg:flex">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border-2 border-white bg-[#D96B43] ring-1 ring-[#D96B43]" aria-hidden="true" />
          {t("map.legendWishlist")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border-2 border-white bg-[#4E8746] ring-1 ring-[#4E8746]" aria-hidden="true" />
          {t("map.legendVisited")}
        </span>
      </div>
    </div>
  );
}
