"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { collectTags, DEFAULT_FILTERS, withDistance } from "@/lib/filters";
import { useAuth } from "./AuthProvider";

const PlacesContext = createContext(null);

const GEO_OPTIONS = { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 };

export function PlacesProvider({ children }) {
  const { token } = useAuth();

  // Keyed by token so a different (or no) user never sees stale data.
  const [state, setState] = useState({ token: null, status: "loading", places: [], error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [addOpen, setAddOpen] = useState(false);
  const [geo, setGeo] = useState({ status: "idle", coords: null });

  useEffect(() => {
    if (!token) return undefined;
    const controller = new AbortController();
    api
      .listPlaces(controller.signal)
      .then((data) => setState({ token, status: "ready", places: data?.items ?? [], error: null }))
      .catch((error) => {
        if (error?.name !== "AbortError") setState({ token, status: "error", places: [], error });
      });
    return () => controller.abort();
  }, [token, reloadKey]);

  // If location permission was granted earlier, show distances without asking again.
  useEffect(() => {
    if (!token || typeof navigator === "undefined" || !navigator.permissions?.query || !navigator.geolocation) {
      return undefined;
    }
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (cancelled || permission.state !== "granted") return;
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!cancelled) {
              setGeo({
                status: "ready",
                coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
              });
            }
          },
          () => {},
          GEO_OPTIONS,
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  const current = state.token === token ? state : { status: token ? "loading" : "idle", places: [], error: null };

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, status: "loading", error: null }));
    setReloadKey((key) => key + 1);
  }, []);

  const upsertPlace = useCallback((place) => {
    setState((previous) => ({
      ...previous,
      places: [place, ...previous.places.filter((item) => item.id !== place.id)],
    }));
  }, []);

  const removePlace = useCallback((id) => {
    setState((previous) => ({ ...previous, places: previous.places.filter((item) => item.id !== id) }));
    setSelectedId((selected) => (selected === id ? null : selected));
  }, []);

  /**
   * Ask the browser for the user's position (shows the permission prompt if needed).
   * `onSuccess(coords)` is called once the position is known.
   */
  const locate = useCallback((onSuccess) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo({ status: "unavailable", coords: null });
      return;
    }
    setGeo((previous) => ({ ...previous, status: "locating" }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setGeo({ status: "ready", coords });
        if (typeof onSuccess === "function") onSuccess(coords);
      },
      (error) => setGeo({ status: error.code === 1 ? "denied" : "unavailable", coords: null }),
      GEO_OPTIONS,
    );
  }, []);

  const places = useMemo(() => withDistance(current.places, geo.coords), [current.places, geo.coords]);
  const tags = useMemo(() => collectTags(current.places), [current.places]);

  const value = useMemo(
    () => ({
      status: current.status,
      error: current.error,
      places,
      tags,
      reload,
      upsertPlace,
      removePlace,
      selectedId,
      setSelectedId,
      filters,
      setFilters,
      resetFilters: () => setFilters(DEFAULT_FILTERS),
      addOpen,
      openAdd: () => setAddOpen(true),
      closeAdd: () => setAddOpen(false),
      geo,
      locate,
    }),
    [current.status, current.error, places, tags, reload, upsertPlace, removePlace, selectedId, filters, addOpen, geo, locate],
  );

  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>;
}

export function usePlaces() {
  const context = useContext(PlacesContext);
  if (!context) throw new Error("usePlaces must be used inside PlacesProvider");
  return context;
}
