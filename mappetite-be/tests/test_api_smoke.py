"""API behaviour that does not need a database (validation, auth guard, envelope)."""

from appname.helpers.jwt_helper import generate_token


def _envelope_ok(body):
    assert set(body) == {"message", "error", "data"}
    assert set(body["error"]) == {"status", "code", "key", "message"}


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.get_json()
    _envelope_ok(body)
    assert body["data"] == {"status": "ok"}
    assert response.headers["X-Content-Type-Options"] == "nosniff"


def test_unknown_route_uses_envelope(client):
    response = client.get("/api/nope")
    assert response.status_code == 404
    body = response.get_json()
    _envelope_ok(body)
    assert body["error"]["key"] == "common.not_found"


def test_places_require_token(client):
    response = client.get("/api/places")
    assert response.status_code == 401
    assert response.get_json()["error"]["key"] == "auth.token_missing"


def test_invalid_token_rejected(client):
    response = client.get("/api/places", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401
    assert response.get_json()["error"]["key"] == "auth.token_invalid"


def test_register_validation_runs_before_database(client):
    response = client.post("/api/auth/register", json={"username": "ok_name", "email": "bad", "password": "secret123"})
    assert response.status_code == 400
    assert response.get_json()["error"]["key"] == "auth.email_invalid"

    response = client.post("/api/auth/register", json={"username": "ok_name", "email": "a@b.co", "password": "short"})
    assert response.get_json()["error"]["key"] == "auth.password_too_short"

    response = client.post("/api/auth/register", json={"username": "ok_name", "email": "a@b.co", "password": "é" * 40})
    assert response.get_json()["error"]["key"] == "auth.password_too_long"


def test_register_requires_json_object(client):
    response = client.post("/api/auth/register", data="[1,2]", content_type="application/json")
    assert response.status_code == 400
    assert response.get_json()["error"]["key"] == "common.invalid_json"


def test_database_not_configured_is_reported(client):
    response = client.post(
        "/api/auth/register", json={"username": "ok_name", "email": "a@b.co", "password": "secret123"}
    )
    assert response.status_code == 503
    assert response.get_json()["error"]["key"] == "common.db_unavailable"


def test_google_login_disabled_without_client_id(client):
    response = client.post("/api/auth/google", json={"credential": "x"})
    assert response.status_code == 503
    assert response.get_json()["error"]["key"] == "auth.google_not_configured"


def test_parse_link_rejects_non_google_before_network(client):
    token = generate_token({"user_id": "00000000-0000-0000-0000-000000000001", "email": "a@b.co"})
    response = client.post(
        "/api/places/parse-link",
        json={"url": "https://example.com/maps/place/x"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["key"] == "places.link_not_google"


def test_create_place_validates_input(client):
    token = generate_token({"user_id": "00000000-0000-0000-0000-000000000001", "email": "a@b.co"})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post("/api/places", json={"name": "", "latitude": 1, "longitude": 2}, headers=headers)
    assert response.get_json()["error"]["key"] == "places.name_invalid"

    response = client.post("/api/places", json={"name": "X", "latitude": 99, "longitude": 2}, headers=headers)
    assert response.get_json()["error"]["key"] == "places.location_invalid"

    response = client.post(
        "/api/places",
        json={"name": "X", "latitude": 1, "longitude": 2, "google_maps_url": "javascript:alert(1)"},
        headers=headers,
    )
    assert response.get_json()["error"]["key"] == "places.link_not_google"

    response = client.post(
        "/api/places", json={"name": "X", "latitude": 1, "longitude": 2, "rating": 4.3}, headers=headers
    )
    assert response.get_json()["error"]["key"] == "places.rating_invalid"


def test_cors_allows_frontend_origin(client):
    response = client.options(
        "/api/places",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization",
        },
    )
    assert response.headers.get("Access-Control-Allow-Origin") == "http://localhost:3000"

    response = client.options(
        "/api/places",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert "Access-Control-Allow-Origin" not in response.headers
