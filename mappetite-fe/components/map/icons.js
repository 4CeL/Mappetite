import L from "@/lib/leaflet";

const COLORS = { wishlist: "#5D6C4B", visited: "#D97745" };
const PIN_PATH = "M0 0C-4-10-16-18-16-28A16 16 0 1 1 16-28C16-18 4-10 0 0Z";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pinSvg(status, scale) {
  const visited = status === "visited";
  // Different inner glyph (dot vs check) so status is not conveyed by colour alone.
  const inner = visited
    ? '<path d="M-6-28l4 4 8-8" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
    : '<circle cx="0" cy="-28" r="6" fill="#fff"/>';
  const width = Math.round(36 * scale);
  const height = Math.round(48 * scale);
  return `<svg class="mp-pin" width="${width}" height="${height}" viewBox="-18 -46 36 48" aria-hidden="true"><path d="${PIN_PATH}" fill="${
    COLORS[visited ? "visited" : "wishlist"]
  }" stroke="#fff" stroke-width="2"/>${inner}</svg>`;
}

/** Map marker for a saved place. The name is HTML-escaped (user input). */
export function placeIcon(place, selected = false) {
  return L.divIcon({
    className: `mp-marker${selected ? " is-selected" : ""}`,
    html: `${pinSvg(place.status, selected ? 1.3 : 1)}<span class="mp-label">${escapeHtml(place.name)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** Plain pin without a label (location picker, detail hero). */
export function pinIcon(status = "wishlist", scale = 1.2) {
  return L.divIcon({ className: "mp-marker", html: pinSvg(status, scale), iconSize: [0, 0], iconAnchor: [0, 0] });
}

export function clusterIcon(cluster) {
  return L.divIcon({
    className: "mp-cluster",
    html: `<div>${cluster.getChildCount()}</div>`,
    iconSize: L.point(40, 40),
  });
}

export function userLocationIcon() {
  return L.divIcon({ className: "mp-user-dot", html: "<span></span>", iconSize: [16, 16] });
}
