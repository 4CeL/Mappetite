import re
import secrets

import bcrypt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from appname.datas.auth import (
    dataCheckEmailExists,
    dataCheckUsernameExists,
    dataGetUserByEmail,
    dataGetUserById,
    dataInsertUser,
    dataUpdateUser,
)
from appname.helpers.jwt_helper import generate_token
from appname.helpers.response import db_fail, fail, ok
from appname.helpers.validation import (
    SUPPORTED_LANGUAGES,
    password_problem,
    validate_email_format,
    validate_username,
)
from config import Config

# Used to keep login timing similar whether or not the email exists.
_DUMMY_HASH = bcrypt.hashpw(b"mappetite-timing-guard", bcrypt.gensalt())
_google_request = google_requests.Request()


def serialize_user(user):
    return {
        "id": str(user["user_id"]),
        "username": user["username"],
        "email": user["email"],
        "auth_provider": user["auth_provider"],
        "preferred_language": user["preferred_language"],
        "created_at": user["created_at"],
    }


def _session(user, message):
    return ok(message, {"token": generate_token(user), "user": serialize_user(user)})


def _language_or_default(language):
    return language if language in SUPPORTED_LANGUAGES else "id"


def RegisterUser(username, email, password, preferred_language=None):
    username = (username or "").strip()
    email = (email or "").strip().lower()

    if not validate_username(username):
        return fail(400, "auth.username_invalid", "Username must be 3–30 characters: letters, numbers, _ or .")
    if not validate_email_format(email):
        return fail(400, "auth.email_invalid", "Email format is invalid")
    problem = password_problem(password)
    if problem:
        return fail(400, problem, "Password must be 8–72 characters")

    err_code, err_msg, exists = dataCheckEmailExists(email)
    if err_code:
        return db_fail(err_code, err_msg)
    if exists:
        return fail(409, "auth.email_exists", "Email is already registered")

    err_code, err_msg, exists = dataCheckUsernameExists(username)
    if err_code:
        return db_fail(err_code, err_msg)
    if exists:
        return fail(409, "auth.username_exists", "Username is already taken")

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    err_code, err_msg, user = dataInsertUser(
        username, email, password_hash, "local", _language_or_default(preferred_language)
    )
    if err_code == 409:
        return fail(409, "auth.email_exists", "Email or username is already registered")
    if err_code:
        return db_fail(err_code, err_msg)

    return _session(user, "Success RegisterUser")


def LoginUser(email, password):
    email = (email or "").strip().lower()
    if not validate_email_format(email) or not isinstance(password, str) or not password:
        return fail(400, "auth.invalid_credentials", "Email or password is incorrect")

    err_code, err_msg, user = dataGetUserByEmail(email, include_password=True)
    if err_code:
        return db_fail(err_code, err_msg)

    if user is None:
        bcrypt.checkpw(b"invalid-password", _DUMMY_HASH)
        return fail(401, "auth.invalid_credentials", "Email or password is incorrect")

    if not user.get("password"):
        # Account was created with Google sign-in and has no password (fixes the SmartHub crash).
        return fail(400, "auth.use_google", "This account uses Google sign-in")

    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72 or not bcrypt.checkpw(password_bytes, user["password"].encode("utf-8")):
        return fail(401, "auth.invalid_credentials", "Email or password is incorrect")

    return _session(user, "Success LoginUser")


def _username_from_google(name, email):
    base = re.sub(r"[^a-z0-9_.]", "", (name or "").lower().replace(" ", "."))
    if len(base) < 3:
        base = re.sub(r"[^a-z0-9_.]", "", email.split("@")[0].lower())
    base = (base or "user")[:24].strip(".") or "user"
    if len(base) < 3:
        base = f"{base}user"
    candidates = [base] + [f"{base}{secrets.randbelow(9000) + 1000}" for _ in range(5)]
    for candidate in candidates:
        err_code, _, exists = dataCheckUsernameExists(candidate)
        if err_code == 0 and not exists:
            return candidate
    return f"user{secrets.token_hex(4)}"


def LoginWithGoogle(credential, preferred_language=None):
    if not Config.GOOGLE_CLIENT_ID:
        return fail(503, "auth.google_not_configured", "Google sign-in is not configured")
    if not isinstance(credential, str) or not credential:
        return fail(400, "auth.google_invalid", "Google credential is required")

    try:
        info = id_token.verify_oauth2_token(credential, _google_request, Config.GOOGLE_CLIENT_ID)
    except ValueError:
        return fail(401, "auth.google_invalid", "Google sign-in failed, please try again")

    email = (info.get("email") or "").lower()
    if not email or not info.get("email_verified"):
        return fail(401, "auth.google_invalid", "Google account email is not verified")

    err_code, err_msg, user = dataGetUserByEmail(email)
    if err_code:
        return db_fail(err_code, err_msg)

    if user is None:
        username = _username_from_google(info.get("name"), email)
        err_code, err_msg, user = dataInsertUser(
            username, email, None, "google", _language_or_default(preferred_language)
        )
        if err_code == 409:
            # Lost a race with a parallel sign-up; the account exists now.
            err_code, err_msg, user = dataGetUserByEmail(email)
        if err_code or user is None:
            return db_fail(err_code or 500, err_msg)

    return _session(user, "Success LoginWithGoogle")


def GetCurrentUser(user_id):
    err_code, err_msg, user = dataGetUserById(user_id)
    if err_code:
        return db_fail(err_code, err_msg)
    if user is None:
        return fail(401, "auth.token_invalid", "Account no longer exists")
    return ok("Success GetCurrentUser", serialize_user(user))


def UpdateCurrentUser(user_id, body):
    changes = {}

    if "username" in body:
        username = (body.get("username") or "").strip()
        if not validate_username(username):
            return fail(400, "auth.username_invalid", "Username must be 3–30 characters: letters, numbers, _ or .")
        err_code, err_msg, exists = dataCheckUsernameExists(username, exclude_user_id=user_id)
        if err_code:
            return db_fail(err_code, err_msg)
        if exists:
            return fail(409, "auth.username_exists", "Username is already taken")
        changes["username"] = username

    if "preferred_language" in body:
        if body.get("preferred_language") not in SUPPORTED_LANGUAGES:
            return fail(400, "auth.language_invalid", "Language must be 'id' or 'en'")
        changes["preferred_language"] = body["preferred_language"]

    err_code, err_msg, user = dataUpdateUser(user_id, changes)
    if err_code == 409:
        return fail(409, "auth.username_exists", "Username is already taken")
    if err_code:
        return db_fail(err_code, err_msg)
    if user is None:
        return fail(401, "auth.token_invalid", "Account no longer exists")
    return ok("Success UpdateCurrentUser", serialize_user(user))
