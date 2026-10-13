from flask import Blueprint

from appname.helpers.response import ok, respond
from appname.routes.auth import auth_bp
from appname.routes.places import places_bp
from appname.routes.tags import tags_bp

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
def health():
    """Liveness check for Render / uptime pings. Does not touch the database."""
    return respond(ok("OK", {"status": "ok"}))


def register_blueprints(app):
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(places_bp, url_prefix="/api/places")
    app.register_blueprint(tags_bp, url_prefix="/api/tags")
