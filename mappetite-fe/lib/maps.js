const ALLOWED_MAPS_URL = /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.|maps\.)?google\.[a-z.]{2,8}\/maps|maps\.google\.[a-z.]{2,8}\/)/i;

/** Link that opens the place in Google Maps (stored link when it is a safe Google Maps URL). */
export function openInMapsUrl(place) {
  if (place?.google_maps_url && ALLOWED_MAPS_URL.test(place.google_maps_url)) {
    return place.google_maps_url;
  }
  return `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
}

/** Google Maps directions to the place (official Maps URLs API). */
export function directionsUrl(place) {
  return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
}
