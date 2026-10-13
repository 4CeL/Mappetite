import pytest

from appname.services.link_parser import (
    LinkError,
    classify_url,
    extract_url,
    is_allowed_maps_url,
    parse_google_maps_url,
    resolve_and_parse,
)

FULL_PLACE_URL = (
    "https://www.google.com/maps/place/Ramen+Hokkori/@-6.2440000,106.8000000,17z/"
    "data=!3m1!4b1!4m6!3m5!1s0x2e69f1a0b1c2d3e4:0x9f8e7d6c5b4a3210!8m2!3d-6.2443812!4d106.8012345!16s%2Fg%2F11abc"
)


class FakeResponse:
    def __init__(self, status_code, location=None):
        self.status_code = status_code
        self.headers = {"Location": location} if location else {}
        self.raw = None

    def close(self):
        pass


class FakeSession:
    """Returns canned responses keyed by URL and records every request."""

    def __init__(self, routes):
        self.routes = routes
        self.requested = []

    def get(self, url, **kwargs):
        self.requested.append(url)
        assert kwargs.get("allow_redirects") is False
        return self.routes[url]


# ---------------------------------------------------------------- parsing

def test_full_place_url_uses_pin_coordinates_and_feature_id():
    parsed = parse_google_maps_url(FULL_PLACE_URL)
    assert parsed.name == "Ramen Hokkori"
    assert parsed.latitude == pytest.approx(-6.2443812)
    assert parsed.longitude == pytest.approx(106.8012345)
    assert parsed.place_ref == "fid:0x2e69f1a0b1c2d3e4:0x9f8e7d6c5b4a3210"


def test_camera_coordinates_are_fallback():
    parsed = parse_google_maps_url("https://www.google.com/maps/place/Kopi+Senja/@-6.26,106.81,15z")
    assert parsed.name == "Kopi Senja"
    assert (parsed.latitude, parsed.longitude) == (-6.26, 106.81)
    assert parsed.place_ref is None


def test_query_coordinates_and_cid():
    parsed = parse_google_maps_url("https://maps.google.com/?q=-6.2,106.8&cid=1234567890")
    assert (parsed.latitude, parsed.longitude) == (-6.2, 106.8)
    assert parsed.place_ref == "cid:1234567890"


def test_query_text_becomes_name_without_location():
    parsed = parse_google_maps_url("https://www.google.com/maps/search/?api=1&query=Sate+Taichan+Senayan")
    assert parsed.name == "Sate Taichan Senayan"
    assert not parsed.has_location


def test_url_encoded_name():
    parsed = parse_google_maps_url("https://www.google.com/maps/place/Bakmi+%22Ayam%22+99/@-6.23,106.85,17z")
    assert parsed.name == 'Bakmi "Ayam" 99'


def test_invalid_coordinates_are_ignored():
    parsed = parse_google_maps_url("https://www.google.com/maps?q=123.0,500.0")
    assert not parsed.has_location


# ---------------------------------------------------------------- hosts

@pytest.mark.parametrize(
    "url,kind",
    [
        ("https://maps.app.goo.gl/abc123", "short"),
        ("https://goo.gl/maps/abc123", "short"),
        ("https://www.google.com/maps/place/X", "google"),
        ("https://www.google.co.id/maps/place/X", "google"),
        ("https://maps.google.com/?q=1,2", "google"),
        ("https://goo.gl/abc123", None),  # goo.gl but not /maps
        ("https://www.google.com/search?q=x", None),  # Google, but not Maps
        ("https://evil.com/maps/place/X", None),
        ("https://google.com.evil.com/maps", None),
        ("javascript:alert(1)", None),
        ("https://user:pass@maps.app.goo.gl/abc", None),
        ("https://maps.app.goo.gl:8443/abc", None),
        ("http://169.254.169.254/latest/meta-data", None),
    ],
)
def test_classify_url(url, kind):
    assert classify_url(url) == kind


def test_is_allowed_maps_url_rejects_consent_and_other_hosts():
    assert is_allowed_maps_url("https://maps.app.goo.gl/abc")
    assert not is_allowed_maps_url("https://consent.google.com/?continue=x")
    assert not is_allowed_maps_url("https://example.com")


def test_extract_url_from_shared_text():
    text = "Ramen Hokkori · Blok M\nhttps://maps.app.goo.gl/x7Kp2QeR9vLm?g_st=ic."
    assert extract_url(text) == "https://maps.app.goo.gl/x7Kp2QeR9vLm?g_st=ic"


def test_extract_url_without_link_raises():
    with pytest.raises(LinkError) as exc:
        extract_url("just some text")
    assert exc.value.key == "places.link_invalid"


# ---------------------------------------------------------------- resolving

def test_short_link_is_followed_to_full_url():
    session = FakeSession({"https://maps.app.goo.gl/abc": FakeResponse(302, FULL_PLACE_URL)})
    parsed = resolve_and_parse("https://maps.app.goo.gl/abc", session=session)
    assert parsed.name == "Ramen Hokkori"
    assert parsed.source_url == "https://maps.app.goo.gl/abc"
    # The final google.com URL is parsed, never fetched.
    assert session.requested == ["https://maps.app.goo.gl/abc"]


def test_consent_page_is_unwrapped_without_fetching():
    consent = "https://consent.google.com/m?continue=" + FULL_PLACE_URL.replace("&", "%26")
    session = FakeSession({"https://maps.app.goo.gl/abc": FakeResponse(302, consent)})
    parsed = resolve_and_parse("https://maps.app.goo.gl/abc", session=session)
    assert parsed.has_location
    assert session.requested == ["https://maps.app.goo.gl/abc"]


def test_redirect_outside_allowlist_is_blocked():
    session = FakeSession({"https://maps.app.goo.gl/abc": FakeResponse(302, "http://169.254.169.254/")})
    with pytest.raises(LinkError) as exc:
        resolve_and_parse("https://maps.app.goo.gl/abc", session=session)
    assert exc.value.key == "places.link_not_google"
    assert session.requested == ["https://maps.app.goo.gl/abc"]


def test_redirect_loop_stops():
    session = FakeSession({"https://maps.app.goo.gl/a": FakeResponse(302, "https://maps.app.goo.gl/a")})
    with pytest.raises(LinkError) as exc:
        resolve_and_parse("https://maps.app.goo.gl/a", session=session)
    assert exc.value.key == "places.link_unreachable"
    assert len(session.requested) <= 6


def test_non_google_link_is_rejected_without_request():
    session = FakeSession({})
    with pytest.raises(LinkError) as exc:
        resolve_and_parse("https://example.com/maps/place/x", session=session)
    assert exc.value.key == "places.link_not_google"
    assert session.requested == []
