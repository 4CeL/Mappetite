from flask import Blueprint, g

from appname.extensions import limiter
from appname.function.auth import (
    GetCurrentUser,
    LoginUser,
    LoginWithGoogle,
    RegisterUser,
    UpdateCurrentUser,
)
from appname.helpers.response import fail, respond
from appname.helpers.validation import check_required_keys, get_json_body
from appname.middleware.jwt_middleware import jwt_required

auth_bp = Blueprint("auth", __name__)


def _invalid_body():
    return respond(fail(400, "common.invalid_json", "Request body must be a JSON object"))


def _missing(keys):
    return respond(fail(400, "common.missing_fields", "Missing required fields: " + ", ".join(keys)))


@auth_bp.post("/register")
@limiter.limit("5 per minute; 30 per hour")
def register():
    body = get_json_body()
    if body is None:
        return _invalid_body()
    missing = check_required_keys(body, ["username", "email", "password"])
    if missing:
        return _missing(missing)
    result = RegisterUser(body["username"], body["email"], body["password"], body.get("preferred_language"))
    return respond(result, success_status=201)


@auth_bp.post("/login")
@limiter.limit("10 per minute; 100 per hour")
def login():
    body = get_json_body()
    if body is None:
        return _invalid_body()
    missing = check_required_keys(body, ["email", "password"])
    if missing:
        return _missing(missing)
    return respond(LoginUser(body["email"], body["password"]))


@auth_bp.post("/google")
@limiter.limit("10 per minute; 100 per hour")
def login_google():
    body = get_json_body()
    if body is None:
        return _invalid_body()
    missing = check_required_keys(body, ["credential"])
    if missing:
        return _missing(missing)
    return respond(LoginWithGoogle(body["credential"], body.get("preferred_language")))


@auth_bp.get("/me")
@jwt_required
def get_me():
    return respond(GetCurrentUser(g.user_id))


@auth_bp.patch("/me")
@jwt_required
def update_me():
    body = get_json_body()
    if body is None:
        return _invalid_body()
    return respond(UpdateCurrentUser(g.user_id, body))
