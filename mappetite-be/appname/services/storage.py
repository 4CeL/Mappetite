"""Supabase Storage access for place photos.

The browser uploads straight to Supabase with a signed upload URL that this
backend creates (the backend's own JWT login is not a Supabase Auth session, so
the browser has no Storage permissions of its own). The service role key never
leaves the backend. The bucket is public: photos are shown through plain URLs
and protected only by their random file names.
"""

import logging

import requests

from config import Config

logger = logging.getLogger(__name__)

TIMEOUT = 10


class StorageError(RuntimeError):
    """Storage is not configured or Supabase rejected/failed the request."""


def is_configured():
    return bool(Config.SUPABASE_URL and Config.SUPABASE_SERVICE_ROLE_KEY)


def _headers():
    key = Config.SUPABASE_SERVICE_ROLE_KEY
    return {"Authorization": f"Bearer {key}", "apikey": key}


def _api(path):
    return f"{Config.SUPABASE_URL}/storage/v1{path}"


def public_url(path):
    return _api(f"/object/public/{Config.PHOTO_BUCKET}/{path}")


def create_signed_upload_url(path):
    """Return a URL the browser can PUT the file to (valid for ~2 hours, one path only)."""
    if not is_configured():
        raise StorageError("Supabase Storage is not configured")
    try:
        response = requests.post(
            _api(f"/object/upload/sign/{Config.PHOTO_BUCKET}/{path}"),
            headers=_headers(),
            json={},
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        relative = response.json()["url"]
    except (requests.RequestException, KeyError, ValueError) as exc:
        logger.error("Could not create signed upload URL: %s", type(exc).__name__)
        raise StorageError("Could not create upload URL") from exc
    return _api(relative if relative.startswith("/") else f"/{relative}")


def stat_object(path):
    """Return {"size": int, "content_type": str} for an uploaded object, or None when it is missing."""
    try:
        with requests.get(public_url(path), stream=True, timeout=TIMEOUT) as response:
            if response.status_code in (400, 404):
                return None
            response.raise_for_status()
            return {
                "size": int(response.headers.get("Content-Length") or 0),
                "content_type": (response.headers.get("Content-Type") or "").split(";")[0].strip(),
            }
    except (requests.RequestException, ValueError) as exc:
        logger.error("Could not check uploaded object: %s", type(exc).__name__)
        raise StorageError("Could not check the uploaded file") from exc


def delete_objects(paths):
    """Best-effort delete. Returns True when Supabase accepted the request.

    A failure only leaves an orphan file in the bucket, so callers do not
    surface it to the user.
    """
    paths = [path for path in paths if path]
    if not paths:
        return True
    if not is_configured():
        logger.warning("Storage not configured; %d photo file(s) left in the bucket", len(paths))
        return False
    try:
        response = requests.delete(
            _api(f"/object/{Config.PHOTO_BUCKET}"),
            headers=_headers(),
            json={"prefixes": paths},
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        return True
    except requests.RequestException as exc:
        logger.error("Could not delete %d photo file(s): %s", len(paths), type(exc).__name__)
        return False
