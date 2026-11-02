const LOCALES = { id: "id-ID", en: "en-US" };

export function localeFor(lang) {
  return LOCALES[lang] || LOCALES.id;
}

export function formatNumber(value, lang, digits = 1) {
  return new Intl.NumberFormat(localeFor(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** "850 m" / "2,7 km" (id) / "2.7 km" (en) */
export function formatDistance(km, lang) {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return `${formatNumber(km, lang, km < 10 ? 1 : 0)} km`;
}

/** Parses "YYYY-MM-DD" (or an ISO timestamp) as a local calendar date. */
function toDate(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "12 September 2026" (id) / "September 12, 2026" (en) */
export function formatDate(value, lang) {
  const date = toDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat(localeFor(lang), { day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** "22.00" (id) / "10:00 PM" (en) from an "HH:MM" string. */
export function formatTimeOfDay(hhmm, lang) {
  if (!hhmm) return null;
  const [hours, minutes] = hhmm.split(":").map(Number);
  // Indonesian uses 24 h with a zero-padded hour ("09.30"); English uses 12 h without padding ("9:30 AM").
  return new Intl.DateTimeFormat(localeFor(lang), {
    hour: lang === "en" ? "numeric" : "2-digit",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hours, minutes));
}

export function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Great-circle distance in kilometres. */
export function distanceKm(a, b) {
  if (!a || !b) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Short area label from an address: the 2nd and 3rd parts ("Blok M, Jakarta Selatan"). */
export function shortArea(address) {
  if (!address) return null;
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(", ");
  return parts.slice(1, 3).join(", ");
}
