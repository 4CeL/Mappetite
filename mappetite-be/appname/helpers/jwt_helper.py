from datetime import datetime, timedelta, timezone

import jwt

from config import Config


def generate_token(user):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user["user_id"]),
        "email": user["email"],
        "iat": now,
        "exp": now + timedelta(hours=Config.JWT_EXPIRES_HOURS),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)


def decode_token(token):
    """Decode and verify a token. Raises jwt.InvalidTokenError subclasses on failure."""
    return jwt.decode(
        token,
        Config.JWT_SECRET,
        algorithms=[Config.JWT_ALGORITHM],
        options={"require": ["exp", "iat", "sub"]},
    )
