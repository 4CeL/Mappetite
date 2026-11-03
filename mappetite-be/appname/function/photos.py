import re
import uuid

from appname.datas.photos import dataAddPhoto, dataCountPhotos, dataDeletePhoto, dataSetCoverPhoto
from appname.helpers.response import db_fail, fail, ok
from appname.helpers.validation import is_uuid
from appname.services.storage import (
    StorageError,
    create_signed_upload_url,
    delete_objects,
    is_configured,
    public_url,
    stat_object,
)
from config import Config

EXTENSIONS = {"image/webp": "webp", "image/jpeg": "jpg", "image/png": "png"}
DIMENSION_MAX = 10_000


def _not_found():
    return fail(404, "places.not_found", "Restaurant not found")


def _unavailable():
    return fail(503, "places.photo_unavailable", "Photo upload is not available right now")


def _limit():
    return fail(409, "places.photo_limit", f"A restaurant can have at most {Config.MAX_PHOTOS_PER_PLACE} photos")


def _path_regex(user_id, saved_place_id):
    return re.compile(rf"^{re.escape(str(user_id))}/{re.escape(saved_place_id)}/[0-9a-f]{{32}}\.(webp|jpg|png)$")


def _int_or_none(value):
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value if 1 <= value <= DIMENSION_MAX else None


def CreatePhotoUploadUrl(user_id, saved_place_id, body):
    """Step 1: validate, then hand the browser a signed URL for a fresh random path."""
    if not is_uuid(saved_place_id):
        return _not_found()
    if not is_configured():
        return _unavailable()

    extension = EXTENSIONS.get(body.get("content_type"))
    size = body.get("size")
    if extension is None or isinstance(size, bool) or not isinstance(size, int) or not 1 <= size <= Config.PHOTO_MAX_BYTES:
        return fail(400, "places.photo_invalid", "Use a JPEG, PNG or WebP image under 1.5 MB")

    err_code, err_msg, count = dataCountPhotos(user_id, saved_place_id)
    if err_code:
        return db_fail(err_code, err_msg)
    if count is None:
        return _not_found()
    if count >= Config.MAX_PHOTOS_PER_PLACE:
        return _limit()

    path = f"{user_id}/{saved_place_id}/{uuid.uuid4().hex}.{extension}"
    try:
        upload_url = create_signed_upload_url(path)
    except StorageError:
        return fail(502, "places.photo_failed", "Could not prepare the upload, please try again")
    return ok("Success CreatePhotoUploadUrl", {"upload_url": upload_url, "path": path})


def ConfirmPhoto(user_id, saved_place_id, body):
    """Step 2: after the browser uploaded the file, verify it exists and record it."""
    if not is_uuid(saved_place_id):
        return _not_found()
    if not is_configured():
        return _unavailable()

    path = body.get("path")
    if not isinstance(path, str) or not _path_regex(user_id, saved_place_id).match(path):
        return fail(400, "places.photo_invalid", "Invalid photo")

    try:
        stat = stat_object(path)
    except StorageError:
        return fail(502, "places.photo_failed", "Could not verify the upload, please try again")
    if stat is None:
        return fail(400, "places.photo_invalid", "The photo was not uploaded")
    if stat["content_type"] not in EXTENSIONS or not 0 < stat["size"] <= Config.PHOTO_MAX_BYTES:
        # The bucket limits should already stop this; never keep a file we would not have accepted.
        delete_objects([path])
        return fail(400, "places.photo_invalid", "Use a JPEG, PNG or WebP image under 1.5 MB")

    err_code, err_msg, result = dataAddPhoto(
        user_id,
        saved_place_id,
        path,
        _int_or_none(body.get("width")),
        _int_or_none(body.get("height")),
        stat["size"],
    )
    if err_code:
        return db_fail(err_code, err_msg)
    state = result["state"]
    if state == "missing":
        return _not_found()
    if state == "limit":
        delete_objects([path])
        return _limit()
    if state == "duplicate":
        return fail(409, "places.photo_invalid", "This photo is already added")

    photo = result["photo"]
    return ok(
        "Success ConfirmPhoto",
        {"id": str(photo["id"]), "url": public_url(photo["path"]), "width": photo["width"], "height": photo["height"]},
    )


def DeletePhoto(user_id, saved_place_id, photo_id):
    if not is_uuid(saved_place_id) or not is_uuid(photo_id):
        return fail(404, "places.photo_not_found", "Photo not found")
    err_code, err_msg, path = dataDeletePhoto(user_id, saved_place_id, photo_id)
    if err_code:
        return db_fail(err_code, err_msg)
    if path is None:
        return fail(404, "places.photo_not_found", "Photo not found")
    delete_objects([path])
    return ok("Success DeletePhoto", {"id": photo_id})


def SetCoverPhoto(user_id, saved_place_id, photo_id):
    if not is_uuid(saved_place_id) or not is_uuid(photo_id):
        return fail(404, "places.photo_not_found", "Photo not found")
    err_code, err_msg, done = dataSetCoverPhoto(user_id, saved_place_id, photo_id)
    if err_code:
        return db_fail(err_code, err_msg)
    if not done:
        return fail(404, "places.photo_not_found", "Photo not found")
    return ok("Success SetCoverPhoto", {"id": photo_id})
