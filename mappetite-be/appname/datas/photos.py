"""Data access for place_photos. Every query is scoped to the owning user."""

from appname.db import run_db
from config import Config


def _owned_place(cur, user_id, saved_place_id, lock=False):
    cur.execute(
        "SELECT saved_place_id FROM saved_places WHERE saved_place_id = %s AND user_id = %s"
        + (" FOR UPDATE" if lock else ""),
        (saved_place_id, user_id),
    )
    return cur.fetchone() is not None


def dataCountPhotos(user_id, saved_place_id):
    """Return the number of photos, or None when the saved place is not the user's."""

    def operation(cur):
        if not _owned_place(cur, user_id, saved_place_id):
            return None
        cur.execute("SELECT COUNT(*) AS c FROM place_photos WHERE saved_place_id = %s", (saved_place_id,))
        return cur.fetchone()["c"]

    return run_db(operation)


def dataAddPhoto(user_id, saved_place_id, storage_path, width, height, size_bytes):
    """Insert a photo at the end of the list.

    Returns {"state": "missing" | "limit" | "duplicate" | "ok", "photo": row|None}.
    The saved_places row is locked so two confirmations cannot both pass the limit.
    """

    def operation(cur):
        if not _owned_place(cur, user_id, saved_place_id, lock=True):
            return {"state": "missing", "photo": None}
        cur.execute(
            "SELECT COUNT(*) AS c, COALESCE(MAX(position) + 1, 0) AS next_position, "
            "bool_or(storage_path = %s) AS exists FROM place_photos WHERE saved_place_id = %s",
            (storage_path, saved_place_id),
        )
        stats = cur.fetchone()
        if stats["exists"]:
            return {"state": "duplicate", "photo": None}
        if stats["c"] >= Config.MAX_PHOTOS_PER_PLACE:
            return {"state": "limit", "photo": None}
        cur.execute(
            "INSERT INTO place_photos (saved_place_id, storage_path, width, height, size_bytes, position) "
            "VALUES (%s, %s, %s, %s, %s, %s) "
            "RETURNING photo_id AS id, storage_path AS path, width, height",
            (saved_place_id, storage_path, width, height, size_bytes, stats["next_position"]),
        )
        return {"state": "ok", "photo": cur.fetchone()}

    return run_db(operation)


def dataDeletePhoto(user_id, saved_place_id, photo_id):
    """Delete one photo and close the gap in positions. Returns its storage path or None."""

    def operation(cur):
        if not _owned_place(cur, user_id, saved_place_id, lock=True):
            return None
        cur.execute(
            "DELETE FROM place_photos WHERE photo_id = %s AND saved_place_id = %s RETURNING storage_path",
            (photo_id, saved_place_id),
        )
        row = cur.fetchone()
        if row is None:
            return None
        _renumber(cur, saved_place_id)
        return row["storage_path"]

    return run_db(operation)


def dataSetCoverPhoto(user_id, saved_place_id, photo_id):
    """Move a photo to position 0. Returns False when the photo is not found."""

    def operation(cur):
        if not _owned_place(cur, user_id, saved_place_id, lock=True):
            return False
        cur.execute(
            "SELECT 1 FROM place_photos WHERE photo_id = %s AND saved_place_id = %s", (photo_id, saved_place_id)
        )
        if cur.fetchone() is None:
            return False
        _renumber(cur, saved_place_id, first=photo_id)
        return True

    return run_db(operation)


def _renumber(cur, saved_place_id, first=None):
    """Rewrite positions as 0..n-1 keeping the current order, optionally putting `first` at 0."""
    cur.execute(
        """
        UPDATE place_photos p SET position = ranked.new_position
        FROM (
            SELECT photo_id,
                   (ROW_NUMBER() OVER (
                       ORDER BY (photo_id = %s::uuid) DESC NULLS LAST, position, created_at
                   ) - 1)::smallint AS new_position
            FROM place_photos WHERE saved_place_id = %s
        ) ranked
        WHERE p.photo_id = ranked.photo_id
        """,
        (first, saved_place_id),
    )
