import os
import sys
from pathlib import Path

# Configure before `config` is imported anywhere. No real database is used.
os.environ["JWT_SECRET"] = "test-secret-" + "x" * 40
os.environ["DATABASE_URL"] = ""
os.environ["GOOGLE_CLIENT_ID"] = ""

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

from app import create_app  # noqa: E402


@pytest.fixture()
def client():
    app = create_app({"TESTING": True, "RATELIMIT_ENABLED": False})
    return app.test_client()
