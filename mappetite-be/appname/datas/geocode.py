from appname.db import run_db


def dataGetCachedAddress(lat_key, lng_key, language):
    def operation(cur):
        cur.execute(
            "SELECT address FROM geocode_cache WHERE lat_key = %s AND lng_key = %s AND language = %s",
            (lat_key, lng_key, language),
        )
        row = cur.fetchone()
        return row["address"] if row else None

    return run_db(operation)


def dataSaveCachedAddress(lat_key, lng_key, language, address):
    def operation(cur):
        cur.execute(
            """
            INSERT INTO geocode_cache (lat_key, lng_key, language, address)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (lat_key, lng_key, language) DO UPDATE SET address = EXCLUDED.address
            """,
            (lat_key, lng_key, language, address),
        )

    return run_db(operation)
