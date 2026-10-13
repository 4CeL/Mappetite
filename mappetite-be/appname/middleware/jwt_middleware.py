from functools import wraps

import jwt
from flask import g, request

from appname.helpers.jwt_helper import decode_token
from appname.helpers.response import fail, respond
from appname.helpers.validation import is_uuid


def jwt_required(fn):
    """Require `Authorization: Bearer <token>` and expose the user id as `g.user_id`."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        scheme, _, token = request.headers.get("Authorization", "").partition(" ")
        token = token.strip()
        if scheme.lower() != "bearer" or not token:
            return respond(fail(401, "auth.token_missing", "Authorization token is required"))
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return respond(fail(401, "auth.token_expired", "Session expired, please log in again"))
        except jwt.InvalidTokenError:
            return respond(fail(401, "auth.token_invalid", "Invalid authorization token"))

        user_id = payload.get("sub")
        if not is_uuid(user_id):
            return respond(fail(401, "auth.token_invalid", "Invalid authorization token"))

        g.user_id = user_id
        return fn(*args, **kwargs)

    return wrapper
