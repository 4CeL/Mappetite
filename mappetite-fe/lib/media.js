import { useSyncExternalStore } from "react";

// Below Tailwind's `lg`: phones and small tablets, where the bottom tab bar and the map sheets are used.
const MOBILE_QUERY = "(max-width: 1023px)";

export function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
}

function subscribe(onChange) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Follows the viewport. Always false on the server and during the first server-rendered pass. */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, isMobileViewport, () => false);
}
