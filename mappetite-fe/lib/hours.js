// Opening hours helpers. Times are "HH:MM" strings (24 h) as stored by the API.
//
// Rules (kept in sync with the backend, see db/migrations/002_opening_hours.sql):
//  - both times set, or neither;
//  - closes_at earlier than opens_at means the place closes after midnight (18:00 → 02:00);
//  - opens_at equal to closes_at means the place is open 24 hours.

export function toMinutes(hhmm) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

export function hasHours(place) {
  return Boolean(place?.opens_at && place?.closes_at);
}

export function isOpen24Hours(opensAt, closesAt) {
  return Boolean(opensAt && closesAt && opensAt === closesAt);
}

/**
 * Whether a place is open at `minuteOfDay` (0–1439, local time of the viewer).
 * Returns null when no hours are known.
 */
export function isOpenAt(opensAt, closesAt, minuteOfDay) {
  if (!opensAt || !closesAt) return null;
  const open = toMinutes(opensAt);
  const close = toMinutes(closesAt);
  if (open === close) return true;
  if (open < close) return minuteOfDay >= open && minuteOfDay < close;
  return minuteOfDay >= open || minuteOfDay < close; // closes after midnight
}

/** Minute of the day (local time) for a timestamp expressed in whole minutes since the epoch. */
export function minuteOfDayFrom(epochMinutes) {
  const date = new Date(epochMinutes * 60000);
  return date.getHours() * 60 + date.getMinutes();
}
