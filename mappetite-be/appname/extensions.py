"""Flask extensions shared across blueprints."""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import Config

limiter = Limiter(
    get_remote_address,
    default_limits=["300 per minute"],
    storage_uri=Config.RATELIMIT_STORAGE_URI,
    headers_enabled=True,
)
