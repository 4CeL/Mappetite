from flask import Blueprint, g, request

from appname.extensions import limiter
from appname.function.places import (
    CreateSavedPlace,
    DeleteSavedPlace,
    GetSavedPlace,
    ListSavedPlaces,
    ParseGoogleMapsLink,
    UpdateSavedPlace,
)
from appname.helpers.response import fail, respond
from appname.helpers.validation import check_required_keys, get_json_body
from appname.middleware.jwt_middleware import jwt_required

places_bp = Blueprint("places", __name__)


def _invalid_body():
    return respond(fail(400, "common.invalid_json", "Request body must be a JSON object"))


@places_bp.post("/parse-link")
@jwt_required
@limiter.limit("20 per minute; 200 per hour")
def parse_link():
    body = get_json_body()
    if body is None:
        return _invalid_body()
    if check_required_keys(body, ["url"]):
        return respond(fail(400, "places.link_invalid", "Please paste a Google Maps link"))
    return respond(ParseGoogleMapsLink(g.user_id, body))


@places_bp.get("")
@jwt_required
def list_places():
    return respond(ListSavedPlaces(g.user_id, request.args))


@places_bp.post("")
@jwt_required
@limiter.limit("60 per minute")
def create_place():
    body = get_json_body()
    if body is None:
        return _invalid_body()
    return respond(CreateSavedPlace(g.user_id, body), success_status=201)


@places_bp.get("/<saved_place_id>")
@jwt_required
def get_place(saved_place_id):
    return respond(GetSavedPlace(g.user_id, saved_place_id))


@places_bp.patch("/<saved_place_id>")
@jwt_required
def update_place(saved_place_id):
    body = get_json_body()
    if body is None:
        return _invalid_body()
    return respond(UpdateSavedPlace(g.user_id, saved_place_id, body))


@places_bp.delete("/<saved_place_id>")
@jwt_required
def delete_place(saved_place_id):
    return respond(DeleteSavedPlace(g.user_id, saved_place_id))
