"""Central configuration for the Mappetite backend.

`.env` is loaded exactly once here (PRD 6.2). Every other module imports
`Config` instead of calling `load_dotenv()` itself.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _int(name, default):
    raw = os.getenv(name, "").strip()
    try:
        return int(raw) if raw else default
    except ValueError:
        return default


def _list(name, default):
    raw = os.getenv(name, "").strip()
    if not raw:
        return list(default)
    return [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]


class Config:
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
    DB_POOL_MIN = max(_int("DB_POOL_MIN", 1), 1)
    DB_POOL_MAX = max(_int("DB_POOL_MAX", 5), 1)

    # Auth
    JWT_SECRET = os.getenv("JWT_SECRET", "").strip()
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256").strip() or "HS256"
    JWT_EXPIRES_HOURS = max(_int("JWT_EXPIRES_HOURS", 24), 1)
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()

    # HTTP
    CORS_ORIGINS = _list("CORS_ORIGINS", ["http://localhost:3000", "http://127.0.0.1:3000"])
    TRUST_PROXY_HOPS = max(_int("TRUST_PROXY_HOPS", 0), 0)
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://").strip() or "memory://"
    PORT = _int("PORT", 5000)
    MAX_CONTENT_LENGTH = 64 * 1024  # request bodies are small JSON payloads

    # Reverse geocoding
    NOMINATIM_URL = os.getenv("NOMINATIM_URL", "https://nominatim.openstreetmap.org/reverse").strip()
    NOMINATIM_USER_AGENT = (
        os.getenv("NOMINATIM_USER_AGENT", "").strip()
        or "Mappetite/0.1 (+https://github.com/4CeL/Mappetite)"
    )

    @classmethod
    def validate(cls):
        """Return a list of configuration problems that must block startup."""
        problems = []
        if len(cls.JWT_SECRET) < 32:
            problems.append("JWT_SECRET must be set and at least 32 characters long")
        if cls.JWT_ALGORITHM not in ("HS256", "HS384", "HS512"):
            problems.append("JWT_ALGORITHM must be one of HS256, HS384, HS512")
        if cls.DB_POOL_MIN > cls.DB_POOL_MAX:
            problems.append("DB_POOL_MIN cannot be greater than DB_POOL_MAX")
        return problems
