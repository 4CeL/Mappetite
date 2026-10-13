"""Postgres connection pool (Supabase) and query helpers.

Data-access functions (appname/datas/*) use `run_db()` so they return the
same `(err_code, err_msg, result)` tuple convention as SmartHub.
"""

import logging
import threading
from contextlib import contextmanager

import psycopg2
import psycopg2.errors
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

from config import Config

logger = logging.getLogger(__name__)

_pool = None
_pool_lock = threading.Lock()


class DatabaseNotConfigured(RuntimeError):
    pass


def _get_pool():
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                if not Config.DATABASE_URL:
                    raise DatabaseNotConfigured("DATABASE_URL is not configured")
                _pool = ThreadedConnectionPool(
                    Config.DB_POOL_MIN,
                    Config.DB_POOL_MAX,
                    dsn=Config.DATABASE_URL,
                    connect_timeout=10,
                    application_name="mappetite-be",
                )
    return _pool


@contextmanager
def get_cursor():
    """Yield a RealDictCursor inside a transaction (commit on success, rollback on error)."""
    pool = _get_pool()
    conn = pool.getconn()
    discard = False
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur
        conn.commit()
    except Exception as exc:
        if isinstance(exc, (psycopg2.OperationalError, psycopg2.InterfaceError)):
            discard = True
        try:
            conn.rollback()
        except psycopg2.Error:
            discard = True
        raise
    finally:
        pool.putconn(conn, close=discard or bool(conn.closed))


def run_db(operation):
    """Run `operation(cursor)` in one transaction.

    Returns (0, "", result) on success, (409, "conflict", None) on unique
    violations, and (500, message, None) on any other database failure.
    Raw database errors are logged, never returned to the client.
    """
    try:
        with get_cursor() as cur:
            return 0, "", operation(cur)
    except psycopg2.errors.UniqueViolation:
        return 409, "conflict", None
    except DatabaseNotConfigured:
        logger.error("DATABASE_URL is not configured")
        return 503, "Database is not configured", None
    except psycopg2.Error:
        logger.exception("Database error")
        return 500, "Database error", None
