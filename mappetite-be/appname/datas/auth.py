from appname.db import run_db

PUBLIC_COLUMNS = "user_id, username, email, auth_provider, preferred_language, created_at"
UPDATABLE_COLUMNS = {"username", "preferred_language"}


def dataGetUserByEmail(email, include_password=False):
    columns = PUBLIC_COLUMNS + (", password" if include_password else "")

    def operation(cur):
        cur.execute(f"SELECT {columns} FROM users WHERE lower(email) = lower(%s)", (email,))
        return cur.fetchone()

    return run_db(operation)


def dataGetUserById(user_id):
    def operation(cur):
        cur.execute(f"SELECT {PUBLIC_COLUMNS} FROM users WHERE user_id = %s", (user_id,))
        return cur.fetchone()

    return run_db(operation)


def dataCheckEmailExists(email):
    def operation(cur):
        cur.execute("SELECT 1 FROM users WHERE lower(email) = lower(%s)", (email,))
        return cur.fetchone() is not None

    return run_db(operation)


def dataCheckUsernameExists(username, exclude_user_id=None):
    def operation(cur):
        cur.execute(
            "SELECT 1 FROM users WHERE lower(username) = lower(%s) AND (%s::uuid IS NULL OR user_id <> %s::uuid)",
            (username, exclude_user_id, exclude_user_id),
        )
        return cur.fetchone() is not None

    return run_db(operation)


def dataInsertUser(username, email, password_hash, auth_provider, preferred_language):
    def operation(cur):
        cur.execute(
            f"""
            INSERT INTO users (username, email, password, auth_provider, preferred_language)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING {PUBLIC_COLUMNS}
            """,
            (username, email.lower(), password_hash, auth_provider, preferred_language),
        )
        return cur.fetchone()

    return run_db(operation)


def dataUpdateUser(user_id, changes):
    columns = [column for column in changes if column in UPDATABLE_COLUMNS]
    if not columns:
        return dataGetUserById(user_id)

    assignments = ", ".join(f"{column} = %s" for column in columns)
    values = [changes[column] for column in columns] + [user_id]

    def operation(cur):
        cur.execute(
            f"UPDATE users SET {assignments} WHERE user_id = %s RETURNING {PUBLIC_COLUMNS}",
            values,
        )
        return cur.fetchone()

    return run_db(operation)
