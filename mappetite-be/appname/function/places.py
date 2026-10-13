from datetime import date, timedelta

from appname.datas.places import (
    dataCreateSavedPlace,
    dataDeleteSavedPlace,
    dataFindDuplicates,
    dataGetSavedPlace,
    dataListSavedPlaces,
    dataUpdateSavedPlace,
)
from appname.helpers.response import db_fail, fail, ok
from appname.helpers.validation import (
    ADDRESS_MAX,
    NAME_MAX,
    NOTES_MAX,
    PLACE_REF_RE,
    STATUSES,
    SUPPORTED_LANGUAGES,
    clean_text,
    is_uuid,
    parse_coordinates,
    parse_iso_date,
    parse_price_level,
    parse_rating,
    parse_tag_names,
)
from appname.services.geocoding import reverse_geocode
from appname.services.link_parser import LinkError, is_allowed_maps_url, resolve_and_parse

SORT_OPTIONS = ("newest", "oldest", "name", "rating")
PAGE_SIZE_MAX = 500


def _serialize(row):
    if row is None:
        return None
    item = dict(row)
    item["id"] = str(item["id"])
    item["place_id"] = str(item["place_id"])
    item["rating"] = float(item["rating"]) if item.get("rating") is not None else None
    item["tags"] = [{"id": str(tag["id"]), "name": tag["name"]} for tag in (item.get("tags") or [])]
    return item


def _serialize_duplicates(rows):
    return [{"id": str(row["id"]), "name": row["name"], "exact": bool(row["exact"])} for row in rows or []]


def _not_found():
    return fail(404, "places.not_found", "Restaurant not found")


# ---------------------------------------------------------------- parse link

def ParseGoogleMapsLink(user_id, body):
    language = body.get("language") if body.get("language") in SUPPORTED_LANGUAGES else "id"
    try:
        parsed = resolve_and_parse(body.get("url"))
    except LinkError as exc:
        return fail(exc.http_status, exc.key, exc.message)

    data = parsed.as_dict()
    data["address"] = None
    data["duplicates"] = []

    if not parsed.has_location:
        # Name may still be known; the frontend lets the user pick the spot on the map.
        return fail(
            422,
            "places.link_no_location",
            "The link has no location. Pick the spot on the map instead.",
            data=data,
        )

    data["address"] = reverse_geocode(parsed.latitude, parsed.longitude, language)

    err_code, _, duplicates = dataFindDuplicates(
        user_id, parsed.place_ref, parsed.latitude, parsed.longitude, parsed.name
    )
    if err_code == 0:
        data["duplicates"] = _serialize_duplicates(duplicates)

    return ok("Success ParseGoogleMapsLink", data)


# ---------------------------------------------------------------- validation

def _validate_personal(body, *, partial, current_status=None):
    """Validate per-user fields. Returns (error_result | None, changes dict)."""
    changes = {}

    if not partial or "status" in body:
        status = body.get("status") or "wishlist"
        if status not in STATUSES:
            return fail(400, "places.status_invalid", "Status must be 'wishlist' or 'visited'"), None
        changes["status"] = status

    if "rating" in body:
        valid, rating = parse_rating(body.get("rating"))
        if not valid:
            return fail(400, "places.rating_invalid", "Rating must be between 0.5 and 5 in 0.5 steps"), None
        changes["rating"] = rating

    if "price_level" in body:
        valid, price = parse_price_level(body.get("price_level"))
        if not valid:
            return fail(400, "places.price_invalid", "Price level must be 1–4"), None
        changes["price_level"] = price

    if "notes" in body:
        valid, notes = clean_text(body.get("notes"), NOTES_MAX, multiline=True)
        if not valid:
            return fail(400, "places.notes_invalid", f"Notes can be at most {NOTES_MAX} characters"), None
        changes["notes"] = notes

    if "visited_at" in body:
        valid, visited_at = parse_iso_date(body.get("visited_at"))
        # +1 day of slack: users ahead of the server's UTC clock (e.g. WIB) may already be "tomorrow".
        if not valid or (visited_at and visited_at > date.today() + timedelta(days=1)):
            return fail(400, "places.visited_at_invalid", "Visit date is invalid"), None
        changes["visited_at"] = visited_at

    # Default the visit date to today when a place becomes "visited" without one.
    new_status = changes.get("status", current_status)
    if new_status == "visited" and "visited_at" not in changes and current_status != "visited":
        changes["visited_at"] = date.today()

    return None, changes


def _validate_tags(body):
    if "tags" not in body:
        return None, None
    valid, names = parse_tag_names(body.get("tags"))
    if not valid:
        return fail(400, "places.tags_invalid", "Up to 10 tags, each 1–30 characters"), None
    return None, names


# ---------------------------------------------------------------- CRUD

def ListSavedPlaces(user_id, args):
    filters = {"page": 1, "page_size": 50}

    status = args.get("status")
    if status:
        if status not in STATUSES:
            return fail(400, "places.status_invalid", "Status must be 'wishlist' or 'visited'")
        filters["status"] = status

    tag_ids = [value for value in (args.get("tags") or "").split(",") if value]
    if any(not is_uuid(value) for value in tag_ids):
        return fail(400, "places.tags_invalid", "Invalid tag filter")
    filters["tag_ids"] = tag_ids

    try:
        prices = [int(value) for value in (args.get("price") or "").split(",") if value]
    except ValueError:
        return fail(400, "places.price_invalid", "Price filter must be numbers 1–4")
    if any(not 1 <= value <= 4 for value in prices):
        return fail(400, "places.price_invalid", "Price filter must be numbers 1–4")
    filters["prices"] = prices

    if args.get("min_rating"):
        valid, rating = parse_rating(args.get("min_rating"))
        if not valid:
            return fail(400, "places.rating_invalid", "Invalid rating filter")
        filters["min_rating"] = rating

    q = (args.get("q") or "").strip()
    if len(q) > 100:
        return fail(400, "places.query_invalid", "Search text is too long")
    filters["q"] = q

    sort = args.get("sort") or "newest"
    if sort not in SORT_OPTIONS:
        return fail(400, "places.sort_invalid", "Unknown sort option")
    filters["sort"] = sort

    try:
        filters["page"] = max(int(args.get("page") or 1), 1)
        filters["page_size"] = min(max(int(args.get("page_size") or 50), 1), PAGE_SIZE_MAX)
    except ValueError:
        return fail(400, "common.bad_request", "page and page_size must be numbers")

    err_code, err_msg, result = dataListSavedPlaces(user_id, filters)
    if err_code:
        return db_fail(err_code, err_msg)

    return ok(
        "Success ListSavedPlaces",
        {
            "items": [_serialize(row) for row in result["items"]],
            "total": result["total"],
            "page": filters["page"],
            "page_size": filters["page_size"],
        },
    )


def GetSavedPlace(user_id, saved_place_id):
    if not is_uuid(saved_place_id):
        return _not_found()
    err_code, err_msg, row = dataGetSavedPlace(user_id, saved_place_id)
    if err_code:
        return db_fail(err_code, err_msg)
    if row is None:
        return _not_found()
    return ok("Success GetSavedPlace", _serialize(row))


def CreateSavedPlace(user_id, body):
    valid, name = clean_text(body.get("name"), NAME_MAX, required=True)
    if not valid:
        return fail(400, "places.name_invalid", f"Name is required (max {NAME_MAX} characters)")

    coords = parse_coordinates(body.get("latitude"), body.get("longitude"))
    if coords is None:
        return fail(400, "places.location_invalid", "A valid location is required")

    valid, address = clean_text(body.get("address"), ADDRESS_MAX)
    if not valid:
        return fail(400, "places.address_invalid", f"Address can be at most {ADDRESS_MAX} characters")

    maps_url = body.get("google_maps_url") or None
    if maps_url is not None and not is_allowed_maps_url(maps_url):
        return fail(400, "places.link_not_google", "Only Google Maps links can be saved")

    place_ref = body.get("google_place_ref") or None
    if place_ref is not None and not (isinstance(place_ref, str) and PLACE_REF_RE.match(place_ref)):
        place_ref = None

    error, personal = _validate_personal(body, partial=False)
    if error:
        return error
    error, tag_names = _validate_tags(body)
    if error:
        return error

    err_code, err_msg, duplicates = dataFindDuplicates(user_id, place_ref, coords[0], coords[1], name)
    if err_code:
        return db_fail(err_code, err_msg)
    duplicates = _serialize_duplicates(duplicates)
    if any(item["exact"] for item in duplicates):
        return fail(409, "places.already_saved", "This restaurant is already in your list", data={"duplicates": duplicates})
    if duplicates and body.get("force") is not True:
        return fail(409, "places.possible_duplicate", "A similar restaurant is already in your list", data={"duplicates": duplicates})

    place = {
        "name": name,
        "address": address,
        "latitude": coords[0],
        "longitude": coords[1],
        "google_maps_url": maps_url,
        "google_place_ref": place_ref,
    }
    err_code, err_msg, row = dataCreateSavedPlace(user_id, place, personal, tag_names or [])
    if err_code == 409:
        return fail(409, "places.already_saved", "This restaurant is already in your list")
    if err_code:
        return db_fail(err_code, err_msg)

    return ok("Success CreateSavedPlace", _serialize(row))


def UpdateSavedPlace(user_id, saved_place_id, body):
    if not is_uuid(saved_place_id):
        return _not_found()

    err_code, err_msg, current = dataGetSavedPlace(user_id, saved_place_id)
    if err_code:
        return db_fail(err_code, err_msg)
    if current is None:
        return _not_found()

    error, personal = _validate_personal(body, partial=True, current_status=current["status"])
    if error:
        return error

    if "name" in body:
        valid, name = clean_text(body.get("name"), NAME_MAX, required=True)
        if not valid:
            return fail(400, "places.name_invalid", f"Name is required (max {NAME_MAX} characters)")
        # Store a custom name only when it differs from the place's own name.
        personal["custom_name"] = None if name == current["original_name"] else name

    location = {}
    if "address" in body:
        valid, address = clean_text(body.get("address"), ADDRESS_MAX)
        if not valid:
            return fail(400, "places.address_invalid", f"Address can be at most {ADDRESS_MAX} characters")
        if address != current["address"]:
            location["address"] = address
    if "latitude" in body or "longitude" in body:
        coords = parse_coordinates(
            body.get("latitude", current["latitude"]), body.get("longitude", current["longitude"])
        )
        if coords is None:
            return fail(400, "places.location_invalid", "A valid location is required")
        if coords != (current["latitude"], current["longitude"]):
            location["latitude"], location["longitude"] = coords

    error, tag_names = _validate_tags(body)
    if error:
        return error

    err_code, err_msg, row = dataUpdateSavedPlace(user_id, saved_place_id, personal, location, tag_names)
    if err_code:
        return db_fail(err_code, err_msg)
    if row is None:
        return _not_found()
    return ok("Success UpdateSavedPlace", _serialize(row))


def DeleteSavedPlace(user_id, saved_place_id):
    if not is_uuid(saved_place_id):
        return _not_found()
    err_code, err_msg, deleted = dataDeleteSavedPlace(user_id, saved_place_id)
    if err_code:
        return db_fail(err_code, err_msg)
    if not deleted:
        return _not_found()
    return ok("Success DeleteSavedPlace", {"id": saved_place_id})
