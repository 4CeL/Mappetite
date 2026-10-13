"""Reverse geocoding through Nominatim (OpenStreetMap).

Usage policy: max 1 request/second and an identifying User-Agent.
Results are cached in the `geocode_cache` table. Failures are never fatal:
the address simply stays empty and the user can type it.
"""

import logging
import threading
import time

import requests

from appname.datas.geocode import dataGetCachedAddress, dataSaveCachedAddress
from config import Config

logger = logging.getLogger(__name__)

_rate_lock = threading.Lock()
_last_request_at = 0.0
MIN_INTERVAL_SECONDS = 1.0
ADDRESS_MAX = 300


def _compact_address(payload):
    """Build a short, readable address from Nominatim's addressdetails."""
    address = payload.get("address") or {}

    def pick(*keys):
        for key in keys:
            value = address.get(key)
            if value:
                return value
        return None

    road = pick("road", "pedestrian", "footway", "street")
    house = address.get("house_number")
    parts = [
        f"{road} No. {house}" if road and house else road,
        pick("suburb", "neighbourhood", "quarter", "village", "hamlet"),
        pick("city", "town", "municipality", "city_district", "county"),
        pick("state", "province"),
    ]
    compact, seen = [], set()
    for part in parts:
        if part and part.lower() not in seen:
            seen.add(part.lower())
            compact.append(part)
    text = ", ".join(compact) or payload.get("display_name") or ""
    return text[:ADDRESS_MAX] or None


def _request_nominatim(lat, lng, language):
    global _last_request_at
    with _rate_lock:
        wait = MIN_INTERVAL_SECONDS - (time.monotonic() - _last_request_at)
        if wait > 0:
            time.sleep(wait)
        try:
            response = requests.get(
                Config.NOMINATIM_URL,
                params={
                    "format": "jsonv2",
                    "lat": f"{lat:.6f}",
                    "lon": f"{lng:.6f}",
                    "zoom": 18,
                    "addressdetails": 1,
                },
                headers={"User-Agent": Config.NOMINATIM_USER_AGENT, "Accept-Language": language},
                timeout=(3.05, 6),
            )
        finally:
            _last_request_at = time.monotonic()
    response.raise_for_status()
    return response.json()


def reverse_geocode(lat, lng, language="id"):
    lat_key, lng_key = round(lat, 5), round(lng, 5)

    err_code, _, cached = dataGetCachedAddress(lat_key, lng_key, language)
    if err_code == 0 and cached:
        return cached

    try:
        payload = _request_nominatim(lat, lng, language)
    except (requests.RequestException, ValueError):
        logger.warning("Reverse geocoding failed for %.5f,%.5f", lat, lng)
        return None

    address = _compact_address(payload) if isinstance(payload, dict) else None
    if address:
        dataSaveCachedAddress(lat_key, lng_key, language, address)
    return address
