"use client";

import { useSyncExternalStore } from "react";

// Whole minutes since the epoch, refreshed by a light timer. Reading the clock through
// useSyncExternalStore keeps components pure and avoids a server/client hydration mismatch:
// the server snapshot is null, so time-dependent UI appears only once the browser has hydrated.
const subscribe = (onChange) => {
  const id = setInterval(onChange, 20000);
  return () => clearInterval(id);
};
const getSnapshot = () => Math.floor(Date.now() / 60000);
const getServerSnapshot = () => null;

export function useNowMinute() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
