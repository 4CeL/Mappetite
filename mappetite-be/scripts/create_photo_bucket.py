"""Create (or update) the public Supabase Storage bucket for place photos.

Run once from mappetite-be after SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
set in .env:

    .\\.venv\\Scripts\\python.exe scripts\\create_photo_bucket.py

The bucket enforces the same limits as the API (file size and image types), so
a client that skips the API still cannot store anything else.
"""

import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import Config  # noqa: E402

SETTINGS = {
    "public": True,
    "file_size_limit": Config.PHOTO_MAX_BYTES,
    "allowed_mime_types": ["image/webp", "image/jpeg", "image/png"],
}


def main():
    if not (Config.SUPABASE_URL and Config.SUPABASE_SERVICE_ROLE_KEY):
        print("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        return 1

    key = Config.SUPABASE_SERVICE_ROLE_KEY
    headers = {"Authorization": f"Bearer {key}", "apikey": key}
    base = f"{Config.SUPABASE_URL}/storage/v1/bucket"
    bucket = Config.PHOTO_BUCKET

    response = requests.post(base, headers=headers, json={"id": bucket, "name": bucket, **SETTINGS}, timeout=15)
    if response.status_code in (200, 201):
        print(f"Bucket '{bucket}' created.")
        return 0

    # Already exists: bring its settings in line instead of failing.
    update = requests.put(f"{base}/{bucket}", headers=headers, json=SETTINGS, timeout=15)
    if update.status_code == 200:
        print(f"Bucket '{bucket}' already existed; settings updated.")
        return 0

    print(f"Could not create the bucket (HTTP {response.status_code} / {update.status_code}).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
