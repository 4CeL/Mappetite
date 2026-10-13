"""Flask application factory for the Mappetite API."""

import logging
import uuid
from datetime import date, datetime
from decimal import Decimal

from flask import Flask
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix

from appname.extensions import limiter
from appname.helpers.response import fail, respond
from appname.routes import register_blueprints
from config import Config


class MappetiteJSONProvider(DefaultJSONProvider):
    """ISO-8601 dates and numeric decimals (Flask's default uses HTTP dates and strings)."""

    sort_keys = False

    @staticmethod
    def default(o):
        if isinstance(o, datetime):
            return o.isoformat()
        if isinstance(o, date):
            return o.isoformat()
        if isinstance(o, Decimal):
            return float(o)
        if isinstance(o, uuid.UUID):
            return str(o)
        return DefaultJSONProvider.default(o)


ERROR_KEYS = {
    400: "common.bad_request",
    401: "auth.token_missing",
    404: "common.not_found",
    405: "common.method_not_allowed",
    413: "common.payload_too_large",
    429: "common.rate_limited",
}


def create_app(overrides=None):
    problems = Config.validate()
    if problems:
        raise RuntimeError("Invalid configuration: " + "; ".join(problems))

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    app = Flask(__name__)
    app.json = MappetiteJSONProvider(app)
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH
    if overrides:
        app.config.update(overrides)

    if Config.TRUST_PROXY_HOPS:
        hops = Config.TRUST_PROXY_HOPS
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=hops, x_proto=hops)

    CORS(
        app,
        resources={r"/api/*": {"origins": Config.CORS_ORIGINS}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        max_age=600,
    )
    limiter.init_app(app)
    register_blueprints(app)

    @app.errorhandler(HTTPException)
    def handle_http_error(exc):
        key = ERROR_KEYS.get(exc.code, "common.server_error" if exc.code >= 500 else "common.bad_request")
        message = "Too many requests, please slow down" if exc.code == 429 else exc.description
        return respond(fail(exc.code, key, message))

    @app.errorhandler(Exception)
    def handle_unexpected_error(exc):
        app.logger.exception("Unhandled error")
        return respond(fail(500, "common.server_error", "Something went wrong, please try again"))

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Cache-Control", "no-store")
        return response

    return app
