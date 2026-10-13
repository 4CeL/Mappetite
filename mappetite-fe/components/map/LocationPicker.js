"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";

import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_TILE_ATTRIBUTION, MAP_TILE_URL } from "@/lib/config";
import L from "@/lib/leaflet";
import { pinIcon } from "./icons";

const round = (value) => Math.round(value * 1e7) / 1e7;

/**
 * Small map with a single pin. Editable: click the map or drag the pin.
 * Read-only: static preview (detail page hero).
 */
export default function LocationPicker({ value, onChange, status = "wishlist", readOnly = false, fallbackCenter, label }) {
  const [map, setMap] = useState(null);
  const latitude = value?.latitude;
  const longitude = value?.longitude;

  // Pin
  useEffect(() => {
    if (!map || latitude == null || longitude == null) return undefined;
    const marker = L.marker([latitude, longitude], {
      icon: pinIcon(status),
      draggable: !readOnly,
      keyboard: false,
      autoPan: true,
    }).addTo(map);
    if (!readOnly) {
      marker.on("dragend", () => {
        const position = marker.getLatLng();
        onChange?.({ latitude: round(position.lat), longitude: round(position.lng) });
      });
    }
    return () => marker.remove();
  }, [map, latitude, longitude, status, readOnly, onChange]);

  // Keep the pin in view when the value changes (parsed link, "use my location", drag).
  useEffect(() => {
    if (!map || latitude == null || longitude == null) return;
    const target = L.latLng(latitude, longitude);
    if (readOnly || map.getZoom() < 14) map.setView(target, Math.max(map.getZoom(), 16), { animate: false });
    else if (!map.getBounds().pad(-0.15).contains(target)) map.panTo(target);
  }, [map, latitude, longitude, readOnly]);

  // Click to drop/move the pin
  useEffect(() => {
    if (!map || readOnly) return undefined;
    const onClick = (event) => onChange?.({ latitude: round(event.latlng.lat), longitude: round(event.latlng.lng) });
    map.on("click", onClick);
    return () => map.off("click", onClick);
  }, [map, readOnly, onChange]);

  const hasValue = latitude != null && longitude != null;
  const center = hasValue ? [latitude, longitude] : fallbackCenter || DEFAULT_CENTER;

  return (
    <MapContainer
      ref={setMap}
      center={center}
      zoom={hasValue ? 16 : DEFAULT_ZOOM}
      className={`h-full w-full ${readOnly ? "" : "cursor-crosshair"}`}
      zoomControl={!readOnly}
      dragging={!readOnly}
      scrollWheelZoom={readOnly ? false : "center"}
      doubleClickZoom={!readOnly}
      touchZoom={!readOnly}
      boxZoom={!readOnly}
      keyboard={!readOnly}
      aria-label={label}
    >
      <TileLayer url={MAP_TILE_URL} attribution={MAP_TILE_ATTRIBUTION} maxZoom={19} />
    </MapContainer>
  );
}
