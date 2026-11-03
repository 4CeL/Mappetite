-- ============================================================
-- Mappetite - 003_place_photos.sql
-- Photos a user uploads for one of their saved places.
-- Files live in the Supabase Storage bucket `place-photos`; this table
-- stores only the object path. Apply manually, after 002.
-- ============================================================

CREATE TABLE IF NOT EXISTS place_photos (
    photo_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    saved_place_id uuid NOT NULL REFERENCES saved_places (saved_place_id) ON DELETE CASCADE,
    -- object path inside the bucket: <user_id>/<saved_place_id>/<random>.<ext>
    storage_path   varchar(200) NOT NULL,
    width          integer CHECK (width IS NULL OR width > 0),
    height         integer CHECK (height IS NULL OR height > 0),
    size_bytes     integer CHECK (size_bytes IS NULL OR size_bytes > 0),
    -- 0 is the cover photo
    position       smallint NOT NULL DEFAULT 0 CHECK (position >= 0),
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (storage_path)
);

CREATE INDEX IF NOT EXISTS place_photos_saved_place_idx ON place_photos (saved_place_id, position);

-- Same access model as the other tables: only the Flask backend (database
-- owner role) reads and writes; Supabase's public REST API gets nothing.
ALTER TABLE place_photos ENABLE ROW LEVEL SECURITY;
