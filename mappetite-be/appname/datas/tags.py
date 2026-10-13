from appname.db import run_db


# ---------- helpers used inside other transactions ----------

def upsert_tags(cur, user_id, names):
    """Create missing tags by name and return their ids (case-insensitive match)."""
    if not names:
        return []
    for name in names:
        cur.execute(
            "INSERT INTO tags (user_id, name) VALUES (%s, %s) ON CONFLICT (user_id, lower(name)) DO NOTHING",
            (user_id, name),
        )
    cur.execute(
        "SELECT tag_id FROM tags WHERE user_id = %s AND lower(name) = ANY(%s)",
        (user_id, [name.lower() for name in names]),
    )
    return [row["tag_id"] for row in cur.fetchall()]


def sync_saved_place_tags(cur, saved_place_id, tag_ids):
    cur.execute("DELETE FROM saved_place_tags WHERE saved_place_id = %s", (saved_place_id,))
    if tag_ids:
        cur.execute(
            """
            INSERT INTO saved_place_tags (saved_place_id, tag_id)
            SELECT %s, unnest(%s::uuid[])
            ON CONFLICT DO NOTHING
            """,
            (saved_place_id, tag_ids),
        )


# ---------- tag management ----------

def dataListTags(user_id):
    def operation(cur):
        cur.execute(
            """
            SELECT t.tag_id AS id, t.name, COUNT(spt.saved_place_id)::int AS usage_count
            FROM tags t
            LEFT JOIN saved_place_tags spt ON spt.tag_id = t.tag_id
            WHERE t.user_id = %s
            GROUP BY t.tag_id, t.name
            ORDER BY usage_count DESC, lower(t.name)
            """,
            (user_id,),
        )
        return cur.fetchall()

    return run_db(operation)


def dataCreateTag(user_id, name):
    def operation(cur):
        cur.execute(
            "INSERT INTO tags (user_id, name) VALUES (%s, %s) RETURNING tag_id AS id, name",
            (user_id, name),
        )
        row = cur.fetchone()
        row["usage_count"] = 0
        return row

    return run_db(operation)


def dataRenameTag(user_id, tag_id, name):
    def operation(cur):
        cur.execute(
            "UPDATE tags SET name = %s WHERE tag_id = %s AND user_id = %s RETURNING tag_id AS id, name",
            (name, tag_id, user_id),
        )
        return cur.fetchone()

    return run_db(operation)


def dataDeleteTag(user_id, tag_id):
    def operation(cur):
        cur.execute("DELETE FROM tags WHERE tag_id = %s AND user_id = %s", (tag_id, user_id))
        return cur.rowcount > 0

    return run_db(operation)
