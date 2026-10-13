"""Uniform response envelope (same shape as SmartHub, plus `error.key`).

{
  "message": str,
  "error": {"status": bool, "code": int, "key": str, "message": str},
  "data": any
}

`error.key` is a stable identifier (e.g. "auth.email_exists") the frontend
translates into the user's language. `error.code` doubles as the HTTP status.
"""

from flask import jsonify


def build(message, *, code=0, key="", error_message="", data=None):
    return {
        "message": message,
        "error": {
            "status": code != 0,
            "code": code,
            "key": key,
            "message": error_message,
        },
        "data": data,
    }


def ok(message="OK", data=None):
    return build(message, data=data)


def fail(code, key, error_message, data=None, message="Failed"):
    return build(message, code=code, key=key, error_message=error_message, data=data)


def db_fail(err_code, err_msg):
    """Map a data-layer error tuple to a response envelope."""
    if err_code == 503:
        return fail(503, "common.db_unavailable", err_msg)
    return fail(500, "common.server_error", "Something went wrong, please try again")


def respond(result, success_status=200):
    code = result["error"]["code"]
    if code == 0:
        status = success_status
    elif 400 <= code <= 599:
        status = code
    else:
        status = 500
    return jsonify(result), status
