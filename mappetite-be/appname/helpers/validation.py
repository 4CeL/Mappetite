"""Hand-written input validation helpers (SmartHub style, no schema library)."""

import re
import uuid
from datetime import date
from decimal import Decimal, InvalidOperation

from flask import request

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.]{3,30}$")
PLACE_REF_RE = re.compile(r"^(fid|cid|pid):[A-Za-z0-9_:\-]{1,200}$")

SUPPORTED_LANGUAGES = ("id", "en")
STATUSES = ("wishlist", "visited")
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_BYTES = 72  # bcrypt limit; bcrypt 5 raises on longer input

NAME_MAX = 120
ADDRESS_MAX = 300
NOTES_MAX = 500
TAG_NAME_MAX = 30
TAGS_PER_PLACE_MAX = 10


def get_json_body():
    """Return the JSON body as a dict, or None if it is missing/not an object."""
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else None


def check_required_keys(body, keys):
    return [key for key in keys if body.get(key) in (None, "")]


def validate_email_format(email):
    return isinstance(email, str) and len(email) <= 254 and bool(EMAIL_RE.match(email))


def validate_username(username):
    return isinstance(username, str) and bool(USERNAME_RE.match(username))


def password_problem(password):
    """Return an error key if the password is not acceptable, else None."""
    if not isinstance(password, str) or len(password) < PASSWORD_MIN_LENGTH:
        return "auth.password_too_short"
    if len(password.encode("utf-8")) > PASSWORD_MAX_BYTES:
        return "auth.password_too_long"
    return None


def is_uuid(value):
    if not isinstance(value, str):
        return False
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


def clean_text(value, max_len, *, required=False, multiline=False):
    """Normalise an optional text field.

    Returns (ok, cleaned). Empty strings become None. Single-line fields have
    their whitespace collapsed; multiline fields (notes) are only trimmed.
    Not ok when the value has the wrong type, is too long, or is required but empty.
    """
    if value is None:
        return (not required), None
    if not isinstance(value, str):
        return False, None
    cleaned = value.replace("\r\n", "\n").strip() if multiline else " ".join(value.split())
    if not cleaned:
        return (not required), None
    if len(cleaned) > max_len:
        return False, None
    return True, cleaned


def parse_coordinates(lat, lng):
    """Return (lat, lng) as floats or None if invalid."""
    if isinstance(lat, bool) or isinstance(lng, bool):
        return None
    try:
        lat_f, lng_f = float(lat), float(lng)
    except (TypeError, ValueError):
        return None
    if not (-90 <= lat_f <= 90 and -180 <= lng_f <= 180):
        return None
    return lat_f, lng_f


def parse_rating(value):
    """Return (ok, Decimal|None). Ratings are 0.5–5.0 in 0.5 steps."""
    if value is None or value == "":
        return True, None
    if isinstance(value, bool):
        return False, None
    try:
        rating = Decimal(str(value))
    except InvalidOperation:
        return False, None
    if rating < Decimal("0.5") or rating > Decimal("5") or (rating * 2) % 1 != 0:
        return False, None
    return True, rating.quantize(Decimal("0.1"))


def parse_price_level(value):
    if value is None or value == "":
        return True, None
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 4:
        return False, None
    return True, value


def parse_iso_date(value):
    if value is None or value == "":
        return True, None
    if not isinstance(value, str):
        return False, None
    try:
        return True, date.fromisoformat(value[:10])
    except ValueError:
        return False, None


def parse_tag_names(value):
    """Return (ok, [names]) — trimmed, de-duplicated case-insensitively."""
    if value is None:
        return True, []
    if not isinstance(value, list) or len(value) > TAGS_PER_PLACE_MAX:
        return False, []
    names, seen = [], set()
    for item in value:
        ok, name = clean_text(item, TAG_NAME_MAX, required=True)
        if not ok:
            return False, []
        if name.lower() not in seen:
            seen.add(name.lower())
            names.append(name)
    return True, names
