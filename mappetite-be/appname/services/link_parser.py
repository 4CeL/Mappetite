"""Google Maps link parsing (PRD section 7).

Only the *URL* is parsed — the Google Maps page itself is never scraped.
Short links (maps.app.goo.gl / goo.gl/maps) are resolved by following
redirects one hop at a time; every hop is re-checked against the host
allowlist so the resolver cannot be abused for SSRF.
"""

import re
from dataclasses import dataclass, field
from urllib.parse import parse_qs, unquote, unquote_plus, urljoin, urlsplit

import requests

MAX_INPUT_LENGTH = 2048
MAX_REDIRECTS = 5
REQUEST_TIMEOUT = (3.05, 6)
MAX_BODY_BYTES = 64 * 1024
REDIRECT_STATUSES = {301, 302, 303, 307, 308}
USER_AGENT = "Mozilla/5.0 (compatible; MappetiteLinkResolver/0.1; +https://github.com/4CeL/Mappetite)"

URL_IN_TEXT_RE = re.compile(r"https?://[^\s<>\"']+", re.IGNORECASE)
GOOGLE_HOST_RE = re.compile(r"^(?:www\.|maps\.)?google\.(?:com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})$")
COORD_PAIR_RE = re.compile(r"^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*\+?\s*(-?\d{1,3}(?:\.\d+)?)\s*$")
PIN_COORDS_RE = re.compile(r"!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)")
CAMERA_COORDS_RE = re.compile(r"@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)")
FEATURE_ID_RE = re.compile(r"(0x[0-9a-fA-F]{1,16}:0x[0-9a-fA-F]{1,16})")
FEATURE_IN_DATA_RE = re.compile(r"!1s(0x[0-9a-fA-F]{1,16}:0x[0-9a-fA-F]{1,16})")
PLACE_ID_RE = re.compile(r"^[A-Za-z0-9_\-]{10,200}$")
EMBEDDED_MAPS_URL_RE = re.compile(r"https://(?:www\.|maps\.)?google\.[a-z.]{2,8}/maps[^\s\"'<>\\]*")

NAME_MAX = 120


class LinkError(Exception):
    def __init__(self, key, message, http_status=400):
        super().__init__(message)
        self.key = key
        self.message = message
        self.http_status = http_status


@dataclass
class ParsedLink:
    name: str = None
    latitude: float = None
    longitude: float = None
    place_ref: str = None
    source_url: str = None
    resolved_url: str = None
    notes: list = field(default_factory=list)

    @property
    def has_location(self):
        return self.latitude is not None and self.longitude is not None

    def as_dict(self):
        return {
            "name": self.name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "google_place_ref": self.place_ref,
            "google_maps_url": self.source_url,
        }


# ---------------------------------------------------------------- hosts

def classify_url(url):
    """Return "short", "google", "consent" or None (not allowed)."""
    try:
        parts = urlsplit(url)
        port = parts.port
    except ValueError:
        return None
    if parts.scheme not in ("http", "https"):
        return None
    if parts.username or parts.password or port not in (None, 80, 443):
        return None
    host = (parts.hostname or "").lower().rstrip(".")
    if host == "maps.app.goo.gl":
        return "short"
    if host == "goo.gl" and parts.path.startswith("/maps"):
        return "short"
    if host == "consent.google.com":
        return "consent"
    if GOOGLE_HOST_RE.match(host) and (host.startswith("maps.") or parts.path.startswith("/maps")):
        return "google"
    return None


def is_allowed_maps_url(url):
    """True for links we are willing to store and show as "Open in Google Maps"."""
    return isinstance(url, str) and len(url) <= MAX_INPUT_LENGTH and classify_url(url) in ("short", "google")


def extract_url(text):
    """Pull the first http(s) URL out of pasted text (share sheets add extra words)."""
    if not isinstance(text, str) or not text.strip():
        raise LinkError("places.link_invalid", "Please paste a Google Maps link")
    if len(text) > MAX_INPUT_LENGTH:
        raise LinkError("places.link_invalid", "Link is too long")
    match = URL_IN_TEXT_RE.search(text.strip())
    if not match:
        raise LinkError("places.link_invalid", "No link found in the text")
    return match.group(0).rstrip(".,;)]}")


# ---------------------------------------------------------------- parsing

def _valid_coords(lat, lng):
    try:
        lat_f, lng_f = float(lat), float(lng)
    except (TypeError, ValueError):
        return None
    if -90 <= lat_f <= 90 and -180 <= lng_f <= 180 and not (lat_f == 0 and lng_f == 0):
        return round(lat_f, 7), round(lng_f, 7)
    return None


def _clean_name(raw):
    if not raw:
        return None
    name = " ".join(unquote_plus(raw).split())
    if not name or COORD_PAIR_RE.match(name):
        return None
    return name[:NAME_MAX]


def parse_google_maps_url(url):
    """Extract name, coordinates and a stable place reference from a full Google Maps URL."""
    parts = urlsplit(url)
    query = parse_qs(parts.query)
    result = ParsedLink(resolved_url=url)

    def first(key):
        values = query.get(key)
        return values[0] if values else None

    # Name: /maps/place/<Name>/...
    place_match = re.search(r"/maps/place/([^/?#]+)", parts.path)
    if place_match:
        result.name = _clean_name(place_match.group(1))

    # Coordinates, most precise first: pin (!3d!4d) → camera (@lat,lng) → query params → /maps/search/<coords>
    coords = None
    pin = PIN_COORDS_RE.search(url)
    if pin:
        coords = _valid_coords(pin.group(1), pin.group(2))
    if coords is None:
        camera = CAMERA_COORDS_RE.search(unquote(parts.path))
        if camera:
            coords = _valid_coords(camera.group(1), camera.group(2))
    for key in ("q", "query", "ll", "destination", "center"):
        value = first(key)
        if not value:
            continue
        pair = COORD_PAIR_RE.match(value)
        if pair:
            coords = coords or _valid_coords(pair.group(1), pair.group(2))
        elif key in ("q", "query") and not result.name:
            result.name = _clean_name(value)
    if coords is None:
        search_match = re.search(r"/maps/search/([^/?#]+)", parts.path)
        if search_match:
            text = unquote_plus(search_match.group(1))
            pair = COORD_PAIR_RE.match(text)
            if pair:
                coords = _valid_coords(pair.group(1), pair.group(2))
            elif not result.name:
                result.name = _clean_name(text)
    if coords:
        result.latitude, result.longitude = coords

    # Stable place reference for duplicate detection
    feature = FEATURE_IN_DATA_RE.search(url)
    ftid = first("ftid")
    cid = first("cid")
    place_id = first("query_place_id") or first("place_id")
    if feature:
        result.place_ref = "fid:" + feature.group(1).lower()
    elif ftid and FEATURE_ID_RE.fullmatch(ftid):
        result.place_ref = "fid:" + ftid.lower()
    elif cid and cid.isdigit() and len(cid) <= 30:
        result.place_ref = "cid:" + cid
    elif place_id and PLACE_ID_RE.match(place_id):
        result.place_ref = "pid:" + place_id

    return result


# ---------------------------------------------------------------- resolving

def _fetch_one_hop(session, url):
    try:
        response = session.get(
            url,
            allow_redirects=False,
            timeout=REQUEST_TIMEOUT,
            headers={"User-Agent": USER_AGENT, "Accept-Language": "en"},
            stream=True,
        )
    except requests.RequestException as exc:
        raise LinkError("places.link_unreachable", "Could not open the link, please try again", 502) from exc
    try:
        if response.status_code in REDIRECT_STATUSES:
            location = response.headers.get("Location")
            if not location:
                raise LinkError("places.link_unreachable", "Link did not redirect anywhere", 502)
            return urljoin(url, location)
        if response.status_code == 404:
            raise LinkError("places.link_invalid", "This short link does not exist", 400)
        if response.status_code == 200:
            # Some short links answer with an HTML/JS redirect page instead of a 302.
            body = response.raw.read(MAX_BODY_BYTES, decode_content=True) or b""
            match = EMBEDDED_MAPS_URL_RE.search(body.decode("utf-8", errors="ignore").replace("\\u003d", "=").replace("\\u0026", "&"))
            if match:
                return match.group(0).replace("&amp;", "&")
        raise LinkError("places.link_unreachable", "Could not read the link", 502)
    finally:
        response.close()


def resolve_and_parse(text, session=None):
    """Turn pasted text into a ParsedLink. Raises LinkError for unusable input."""
    url = extract_url(text)
    kind = classify_url(url)
    if kind is None:
        raise LinkError("places.link_not_google", "Only Google Maps links are supported")

    source_url = url
    session = session or requests.Session()
    for _ in range(MAX_REDIRECTS + 1):
        if kind == "google":
            parsed = parse_google_maps_url(url)
            parsed.source_url = source_url
            return parsed
        if kind == "consent":
            target = (parse_qs(urlsplit(url).query).get("continue") or [None])[0]
            if not target:
                raise LinkError("places.link_unreachable", "Could not read the link", 502)
            url = target
        else:  # short link → follow exactly one redirect
            url = _fetch_one_hop(session, url)
        kind = classify_url(url)
        if kind is None:
            raise LinkError("places.link_not_google", "The link does not lead to Google Maps")

    raise LinkError("places.link_unreachable", "Too many redirects", 502)
