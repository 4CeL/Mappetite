"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny external store backed by localStorage, read through
 * useSyncExternalStore so React stays in sync across tabs and components
 * without setState-in-effect patterns.
 */
export function createLocalStore(key, { parse = JSON.parse, serialize = JSON.stringify, fallback = null } = {}) {
  const listeners = new Set();
  let cache;
  let loaded = false;

  function read() {
    try {
      const raw = window.localStorage.getItem(key);
      return raw == null ? fallback : parse(raw);
    } catch {
      return fallback;
    }
  }

  function get() {
    if (typeof window === "undefined") return fallback;
    if (!loaded) {
      cache = read();
      loaded = true;
    }
    return cache;
  }

  function set(value) {
    cache = value;
    loaded = true;
    try {
      if (value == null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, serialize(value));
    } catch {
      // Storage may be unavailable (private mode); keep the in-memory value.
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener) {
    listeners.add(listener);
    const onStorage = (event) => {
      if (event.key === key) {
        cache = read();
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function useValue() {
    return useSyncExternalStore(subscribe, get, () => fallback);
  }

  return { get, set, subscribe, useValue };
}

const noopSubscribe = () => () => {};

/** False during prerender/hydration, true once running in the browser. */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
