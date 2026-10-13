"""Data access for places and saved_places.

`places` rows hold location data and can be shared between users when they
save the same Google Maps place (same `google_place_ref`). Everything personal
(status, rating, notes, tags, custom name) lives in `saved_places`.
"""

from appname.datas.tags import sync_saved_place_tags, upsert_tags
from appname.db import run_db

# Two submissions with the same place ref are treated as the same place only
# when their pins are this close (degrees, ~25 m). Otherwise a user moved the
# pin and gets their own `places` row.
SAME_PLACE_DELTA = 0.00025
# Possible-duplicate radius for places without a shared ref (~55 m).
DUPLICATE_DELTA = 0.0005

SAVED_PLACE_COLUMNS = """
    sp.saved_place_id AS id,
    sp.place_id,
    COALESCE(NULLIF(sp.custom_name, ''), p.name) AS name,
    p.name AS original_name,
    p.address,
    p.latitude,
    p.longitude,
    p.google_maps_url,
    sp.status,
    sp.rating,
    sp.price_level,
    sp.notes,
    sp.visited_at,
    sp.created_at,
    sp.updated_at,
    COALESCE((
        SELECT json_agg(json_build_object('id', t.tag_id, 'name', t.name) ORDER BY lower(t.name))
        FROM saved_place_tags spt
        JOIN tags t ON t.tag_id = spt.tag_id
        WHERE spt.saved_place_id = sp.saved_place_id
    ), '[]'::json) AS tags
"""
SAVED_PLACE_FROM = " FROM saved_places sp JOIN places p ON p.place_id = sp.place_id"
SAVED_PLACE_SELECT = "SELECT" + SAVED_PLACE_COLUMNS + SAVED_PLACE_FROM

SORTS = {
    "newest": "sp.created_at DESC",
    "oldest": "sp.created_at ASC",
    "name": "lower(COALESCE(NULLIF(sp.custom_name, ''), p.name)) ASC",
    "rating": "sp.rating DESC NULLS LAST, sp.created_at DESC",
}


def _escape_like(text):
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _fetch_saved_place(cur, user_id, saved_place_id):
    cur.execute(
        SAVED_PLACE_SELECT + " WHERE sp.user_id = %s AND sp.saved_place_id = %s",
        (user_id, saved_place_id),
    )
    return cur.fetchone()


def _insert_place(cur, place):
    cur.execute(
        """
        INSERT INTO places (name, address, latitude, longitude, google_maps_url, google_place_ref)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING place_id
        """,
        (
            place["name"],
            place.get("address"),
            place["latitude"],
            place["longitude"],
            place.get("google_maps_url"),
            place.get("google_place_ref"),
        ),
    )
    return cur.fetchone()["place_id"]


def _find_or_create_place(cur, place):
    ref = place.get("google_place_ref")
    if ref:
        cur.execute(
            "SELECT place_id, latitude, longitude FROM places WHERE google_place_ref = %s",
            (ref,),
        )
        existing = cur.fetchone()
        if existing:
            close = (
                abs(existing["latitude"] - place["latitude"]) <= SAME_PLACE_DELTA
                and abs(existing["longitude"] - place["longitude"]) <= SAME_PLACE_DELTA
            )
            if close:
                return existing["place_id"]
            # Pin was moved away from the shared place: keep a private copy without the ref.
            place = {**place, "google_place_ref": None}
    return _insert_place(cur, place)


# ---------------------------------------------------------------- queries

def dataListSavedPlaces(user_id, filters):
    conditions = ["sp.user_id = %(user_id)s"]
    params = {"user_id": user_id}

    if filters.get("status"):
        conditions.append("sp.status = %(status)s")
        params["status"] = filters["status"]
    if filters.get("prices"):
        conditions.append("sp.price_level = ANY(%(prices)s)")
        params["prices"] = filters["prices"]
    if filters.get("min_rating") is not None:
        conditions.append("sp.rating >= %(min_rating)s")
        params["min_rating"] = filters["min_rating"]
    if filters.get("tag_ids"):
        conditions.append(
            "EXISTS (SELECT 1 FROM saved_place_tags x WHERE x.saved_place_id = sp.saved_place_id "
            "AND x.tag_id = ANY(%(tag_ids)s::uuid[]))"
        )
        params["tag_ids"] = filters["tag_ids"]
    if filters.get("q"):
        conditions.append(
            "(COALESCE(sp.custom_name, '') ILIKE %(q)s OR p.name ILIKE %(q)s OR COALESCE(p.address, '') ILIKE %(q)s "
            "OR COALESCE(sp.notes, '') ILIKE %(q)s OR EXISTS (SELECT 1 FROM saved_place_tags y JOIN tags ty "
            "ON ty.tag_id = y.tag_id WHERE y.saved_place_id = sp.saved_place_id AND ty.name ILIKE %(q)s))"
        )
        params["q"] = f"%{_escape_like(filters['q'])}%"

    params["limit"] = filters["page_size"]
    params["offset"] = (filters["page"] - 1) * filters["page_size"]
    order_by = SORTS.get(filters.get("sort"), SORTS["newest"])

    where = " WHERE " + " AND ".join(conditions)
    sql = (
        "SELECT" + SAVED_PLACE_COLUMNS + ", COUNT(*) OVER() AS total_count"
        + SAVED_PLACE_FROM + where
        + f" ORDER BY {order_by} LIMIT %(limit)s OFFSET %(offset)s"
    )

    def operation(cur):
        cur.execute(sql, params)
        rows = cur.fetchall()
        total = rows[0]["total_count"] if rows else 0
        if not rows and params["offset"]:
            cur.execute("SELECT COUNT(*) AS c" + SAVED_PLACE_FROM + where, params)
            total = cur.fetchone()["c"]
        for row in rows:
            row.pop("total_count", None)
        return {"items": rows, "total": total}

    return run_db(operation)


def dataGetSavedPlace(user_id, saved_place_id):
    return run_db(lambda cur: _fetch_saved_place(cur, user_id, saved_place_id))


def dataFindDuplicates(user_id, place_ref, latitude, longitude, name):
    def operation(cur):
        cur.execute(
            """
            SELECT
                sp.saved_place_id AS id,
                COALESCE(NULLIF(sp.custom_name, ''), p.name) AS name,
                (%(ref)s::text IS NOT NULL AND p.google_place_ref = %(ref)s::text) AS exact
            FROM saved_places sp
            JOIN places p ON p.place_id = sp.place_id
            WHERE sp.user_id = %(user_id)s
              AND (
                (%(ref)s::text IS NOT NULL AND p.google_place_ref = %(ref)s::text)
                OR (
                  abs(p.latitude - %(lat)s) <= %(delta)s
                  AND abs(p.longitude - %(lng)s) <= %(delta)s
                  AND (lower(p.name) = lower(%(name)s) OR lower(COALESCE(sp.custom_name, '')) = lower(%(name)s))
                )
              )
            ORDER BY exact DESC
            LIMIT 5
            """,
            {
                "user_id": user_id,
                "ref": place_ref,
                "lat": latitude,
                "lng": longitude,
                "name": name or "",
                "delta": DUPLICATE_DELTA,
            },
        )
        return cur.fetchall()

    return run_db(operation)


# ---------------------------------------------------------------- writes

def dataCreateSavedPlace(user_id, place, personal, tag_names):
    """Create (or reuse) the place row, the saved_place row and its tags in one transaction."""

    def operation(cur):
        place_id = _find_or_create_place(cur, place)
        cur.execute(
            """
            INSERT INTO saved_places (user_id, place_id, custom_name, status, rating, price_level, notes, visited_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING saved_place_id
            """,
            (
                user_id,
                place_id,
                personal.get("custom_name"),
                personal["status"],
                personal.get("rating"),
                personal.get("price_level"),
                personal.get("notes"),
                personal.get("visited_at"),
            ),
        )
        saved_place_id = cur.fetchone()["saved_place_id"]
        sync_saved_place_tags(cur, saved_place_id, upsert_tags(cur, user_id, tag_names))
        return _fetch_saved_place(cur, user_id, saved_place_id)

    return run_db(operation)


def dataUpdateSavedPlace(user_id, saved_place_id, personal, location, tag_names):
    """Update a saved place.

    `personal`: subset of saved_places columns to change.
    `location`: subset of {address, latitude, longitude} or empty. If the
    underlying place row is shared with other users, a private copy is made
    instead of editing the shared row.
    `tag_names`: list replaces all tags, None leaves tags unchanged.
    Returns the updated row, or None when the saved place does not exist.
    """
    allowed_personal = {"custom_name", "status", "rating", "price_level", "notes", "visited_at"}

    def operation(cur):
        cur.execute(
            """
            SELECT sp.place_id, p.name, p.address, p.latitude, p.longitude, p.google_maps_url,
                   (SELECT COUNT(*) FROM saved_places other WHERE other.place_id = sp.place_id) AS usage_count
            FROM saved_places sp JOIN places p ON p.place_id = sp.place_id
            WHERE sp.user_id = %s AND sp.saved_place_id = %s
            FOR UPDATE OF sp
            """,
            (user_id, saved_place_id),
        )
        current = cur.fetchone()
        if current is None:
            return None

        if location:
            if current["usage_count"] > 1:
                new_place_id = _insert_place(
                    cur,
                    {
                        "name": current["name"],
                        "address": location.get("address", current["address"]),
                        "latitude": location.get("latitude", current["latitude"]),
                        "longitude": location.get("longitude", current["longitude"]),
                        "google_maps_url": current["google_maps_url"],
                        "google_place_ref": None,
                    },
                )
                cur.execute(
                    "UPDATE saved_places SET place_id = %s WHERE saved_place_id = %s",
                    (new_place_id, saved_place_id),
                )
            else:
                columns = [column for column in ("address", "latitude", "longitude") if column in location]
                cur.execute(
                    "UPDATE places SET " + ", ".join(f"{column} = %s" for column in columns) + " WHERE place_id = %s",
                    [location[column] for column in columns] + [current["place_id"]],
                )

        columns = [column for column in personal if column in allowed_personal]
        if columns:
            cur.execute(
                "UPDATE saved_places SET " + ", ".join(f"{column} = %s" for column in columns)
                + " WHERE saved_place_id = %s AND user_id = %s",
                [personal[column] for column in columns] + [saved_place_id, user_id],
            )
        elif location or tag_names is not None:
            cur.execute("UPDATE saved_places SET updated_at = now() WHERE saved_place_id = %s", (saved_place_id,))

        if tag_names is not None:
            sync_saved_place_tags(cur, saved_place_id, upsert_tags(cur, user_id, tag_names))

        return _fetch_saved_place(cur, user_id, saved_place_id)

    return run_db(operation)


def dataDeleteSavedPlace(user_id, saved_place_id):
    """Delete a saved place; remove the place row too when nobody else uses it."""

    def operation(cur):
        cur.execute(
            "DELETE FROM saved_places WHERE saved_place_id = %s AND user_id = %s RETURNING place_id",
            (saved_place_id, user_id),
        )
        row = cur.fetchone()
        if row is None:
            return False
        cur.execute(
            "DELETE FROM places WHERE place_id = %s AND NOT EXISTS "
            "(SELECT 1 FROM saved_places WHERE place_id = %s)",
            (row["place_id"], row["place_id"]),
        )
        return True

    return run_db(operation)
