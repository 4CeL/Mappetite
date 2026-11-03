"""Photo endpoints with Supabase Storage and the database replaced by fakes."""

import pytest

from appname.function import photos as photos_fn
from appname.helpers.jwt_helper import generate_token
from config import Config

USER_ID = "00000000-0000-0000-0000-000000000001"
PLACE_ID = "11111111-1111-1111-1111-111111111111"
PHOTO_ID = "22222222-2222-2222-2222-222222222222"
GOOD_PATH = f"{USER_ID}/{PLACE_ID}/{'a' * 32}.webp"


@pytest.fixture()
def headers():
    token = generate_token({"user_id": USER_ID, "email": "a@b.co"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def storage(monkeypatch):
    """Configured storage that records what the code asks of it."""
    calls = {"deleted": [], "signed": []}
    monkeypatch.setattr(photos_fn, "is_configured", lambda: True)

    def sign(path):
        calls["signed"].append(path)
        return f"https://x.supabase.co/storage/v1/object/upload/sign/place-photos/{path}?token=t"

    monkeypatch.setattr(photos_fn, "create_signed_upload_url", sign)
    monkeypatch.setattr(photos_fn, "delete_objects", lambda paths: calls["deleted"].extend(paths) or True)
    monkeypatch.setattr(photos_fn, "public_url", lambda path: f"https://x.supabase.co/public/{path}")
    calls["stat"] = {"size": 200_000, "content_type": "image/webp"}
    monkeypatch.setattr(photos_fn, "stat_object", lambda path: calls["stat"])
    return calls


def _upload_url(client, headers, **body):
    payload = {"content_type": "image/webp", "size": 200_000, **body}
    return client.post(f"/api/places/{PLACE_ID}/photos/upload-url", json=payload, headers=headers)


def test_photo_routes_require_token(client):
    assert client.post(f"/api/places/{PLACE_ID}/photos/upload-url", json={}).status_code == 401
    assert client.delete(f"/api/places/{PLACE_ID}/photos/{PHOTO_ID}").status_code == 401


def test_upload_url_unavailable_without_storage_config(client, headers, monkeypatch):
    monkeypatch.setattr(photos_fn, "is_configured", lambda: False)
    response = _upload_url(client, headers)
    assert response.status_code == 503
    assert response.get_json()["error"]["key"] == "places.photo_unavailable"


@pytest.mark.parametrize(
    "body",
    [
        {"content_type": "image/gif"},
        {"content_type": "text/html"},
        {"content_type": None},
        {"size": 0},
        {"size": Config.PHOTO_MAX_BYTES + 1},
        {"size": "200000"},
        {"size": True},
    ],
)
def test_upload_url_validates_input(client, headers, storage, body):
    response = _upload_url(client, headers, **body)
    assert response.status_code == 400
    assert response.get_json()["error"]["key"] == "places.photo_invalid"
    assert storage["signed"] == []


def test_upload_url_unknown_place_is_404(client, headers, storage, monkeypatch):
    monkeypatch.setattr(photos_fn, "dataCountPhotos", lambda *args: (0, "", None))
    response = _upload_url(client, headers)
    assert response.status_code == 404
    assert response.get_json()["error"]["key"] == "places.not_found"


def test_upload_url_rejects_non_uuid_place(client, headers, storage):
    response = client.post(
        "/api/places/not-a-uuid/photos/upload-url", json={"content_type": "image/webp", "size": 1000}, headers=headers
    )
    assert response.status_code == 404


def test_upload_url_enforces_photo_limit(client, headers, storage, monkeypatch):
    monkeypatch.setattr(photos_fn, "dataCountPhotos", lambda *args: (0, "", Config.MAX_PHOTOS_PER_PLACE))
    response = _upload_url(client, headers)
    assert response.status_code == 409
    assert response.get_json()["error"]["key"] == "places.photo_limit"
    assert storage["signed"] == []


def test_upload_url_success_uses_random_path_under_user_and_place(client, headers, storage, monkeypatch):
    monkeypatch.setattr(photos_fn, "dataCountPhotos", lambda *args: (0, "", 2))
    first = _upload_url(client, headers).get_json()["data"]
    second = _upload_url(client, headers, content_type="image/jpeg").get_json()["data"]

    assert first["path"].startswith(f"{USER_ID}/{PLACE_ID}/")
    assert first["path"].endswith(".webp") and second["path"].endswith(".jpg")
    assert first["path"] != second["path"]
    assert first["upload_url"].endswith(f"{first['path']}?token=t")


def _confirm(client, headers, **body):
    payload = {"path": GOOD_PATH, "width": 1200, "height": 800, **body}
    return client.post(f"/api/places/{PLACE_ID}/photos", json=payload, headers=headers)


@pytest.mark.parametrize(
    "path",
    [
        None,
        "",
        "../../etc/passwd",
        f"{USER_ID}/{PLACE_ID}/{'a' * 32}.exe",
        f"{USER_ID}/{PLACE_ID}/short.webp",
        # another user's folder / another place's folder
        f"99999999-9999-9999-9999-999999999999/{PLACE_ID}/{'a' * 32}.webp",
        f"{USER_ID}/99999999-9999-9999-9999-999999999999/{'a' * 32}.webp",
    ],
)
def test_confirm_rejects_foreign_or_malformed_paths(client, headers, storage, path):
    response = _confirm(client, headers, path=path)
    assert response.status_code == 400
    assert response.get_json()["error"]["key"] == "places.photo_invalid"


def test_confirm_rejects_missing_object(client, headers, storage):
    storage["stat"] = None
    response = _confirm(client, headers)
    assert response.status_code == 400
    assert response.get_json()["error"]["key"] == "places.photo_invalid"


def test_confirm_deletes_oversized_or_wrong_type_object(client, headers, storage, monkeypatch):
    storage["stat"] = {"size": Config.PHOTO_MAX_BYTES + 1, "content_type": "image/webp"}
    assert _confirm(client, headers).status_code == 400
    storage["stat"] = {"size": 1000, "content_type": "text/html"}
    assert _confirm(client, headers).status_code == 400
    assert storage["deleted"] == [GOOD_PATH, GOOD_PATH]


def test_confirm_success_records_server_side_size(client, headers, storage, monkeypatch):
    seen = {}

    def add(user_id, place_id, path, width, height, size):
        seen.update(user_id=user_id, place_id=place_id, path=path, width=width, height=height, size=size)
        return 0, "", {"state": "ok", "photo": {"id": PHOTO_ID, "path": path, "width": width, "height": height}}

    monkeypatch.setattr(photos_fn, "dataAddPhoto", add)
    response = _confirm(client, headers, width=1200, height="oops", size=1)
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data == {"id": PHOTO_ID, "url": f"https://x.supabase.co/public/{GOOD_PATH}", "width": 1200, "height": None}
    # size comes from Storage, never from the client; bad dimensions become NULL
    assert seen["size"] == 200_000 and seen["height"] is None and seen["user_id"] == USER_ID


def test_confirm_over_limit_removes_the_uploaded_file(client, headers, storage, monkeypatch):
    monkeypatch.setattr(photos_fn, "dataAddPhoto", lambda *args: (0, "", {"state": "limit", "photo": None}))
    response = _confirm(client, headers)
    assert response.status_code == 409
    assert response.get_json()["error"]["key"] == "places.photo_limit"
    assert storage["deleted"] == [GOOD_PATH]


def test_confirm_unknown_place_is_404(client, headers, storage, monkeypatch):
    monkeypatch.setattr(photos_fn, "dataAddPhoto", lambda *args: (0, "", {"state": "missing", "photo": None}))
    assert _confirm(client, headers).status_code == 404


def test_delete_photo_removes_storage_file(client, headers, storage, monkeypatch):
    monkeypatch.setattr(photos_fn, "dataDeletePhoto", lambda *args: (0, "", GOOD_PATH))
    response = client.delete(f"/api/places/{PLACE_ID}/photos/{PHOTO_ID}", headers=headers)
    assert response.status_code == 200
    assert storage["deleted"] == [GOOD_PATH]


def test_delete_photo_not_found(client, headers, storage, monkeypatch):
    monkeypatch.setattr(photos_fn, "dataDeletePhoto", lambda *args: (0, "", None))
    response = client.delete(f"/api/places/{PLACE_ID}/photos/{PHOTO_ID}", headers=headers)
    assert response.status_code == 404
    assert response.get_json()["error"]["key"] == "places.photo_not_found"
    assert storage["deleted"] == []


def test_set_cover(client, headers, monkeypatch):
    monkeypatch.setattr(photos_fn, "dataSetCoverPhoto", lambda *args: (0, "", True))
    assert client.patch(f"/api/places/{PLACE_ID}/photos/{PHOTO_ID}/cover", headers=headers).status_code == 200
    monkeypatch.setattr(photos_fn, "dataSetCoverPhoto", lambda *args: (0, "", False))
    assert client.patch(f"/api/places/{PLACE_ID}/photos/{PHOTO_ID}/cover", headers=headers).status_code == 404


def test_delete_place_removes_its_photo_files(client, headers, monkeypatch):
    from appname.function import places as places_fn

    removed = []
    monkeypatch.setattr(places_fn, "dataDeleteSavedPlace", lambda *args: (0, "", [GOOD_PATH, "b/c/d.webp"]))
    monkeypatch.setattr(places_fn, "delete_objects", lambda paths: removed.extend(paths) or True)
    response = client.delete(f"/api/places/{PLACE_ID}", headers=headers)
    assert response.status_code == 200
    assert removed == [GOOD_PATH, "b/c/d.webp"]


def test_serialize_adds_photos_and_cover_url(monkeypatch):
    from appname.function import places as places_fn

    monkeypatch.setattr(places_fn, "public_url", lambda path: f"https://x/{path}")
    row = {
        "id": PLACE_ID, "place_id": PLACE_ID, "rating": None, "tags": [],
        "photos": [
            {"id": PHOTO_ID, "path": "u/p/1.webp", "width": 10, "height": 20},
            {"id": PLACE_ID, "path": "u/p/2.webp", "width": None, "height": None},
        ],
    }
    item = places_fn._serialize(row)
    assert item["cover_url"] == "https://x/u/p/1.webp"
    assert [photo["url"] for photo in item["photos"]] == ["https://x/u/p/1.webp", "https://x/u/p/2.webp"]
    assert "path" not in item["photos"][0]

    empty = places_fn._serialize({**row, "photos": []})
    assert empty["photos"] == [] and empty["cover_url"] is None
