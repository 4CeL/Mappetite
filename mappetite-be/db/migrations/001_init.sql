-- ============================================================
-- Mappetite — 001_init.sql
-- Run once in the Supabase SQL Editor (PRD 6.2: no migration tool,
-- files are applied manually in order).
-- ============================================================

-- gen_random_uuid() is built into Postgres 13+ (Supabase runs 15+).

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- users ----------
CREATE TABLE IF NOT EXISTS users (
    user_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username           varchar(30)  NOT NULL,
    email              varchar(254) NOT NULL,
    -- bcrypt hash; NULL for accounts created through Google sign-in
    password           varchar(100),
    auth_provider      varchar(10)  NOT NULL DEFAULT 'local'
                       CHECK (auth_provider IN ('local', 'google')),
    preferred_language varchar(2)   NOT NULL DEFAULT 'id'
                       CHECK (preferred_language IN ('id', 'en')),
    created_at         timestamptz  NOT NULL DEFAULT now(),
    updated_at         timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key    ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_key ON users (lower(username));
DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- places (location data, may be shared between users) ----------
CREATE TABLE IF NOT EXISTS places (
    place_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name             varchar(120) NOT NULL,
    address          varchar(300),
    latitude         double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude        double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    google_maps_url  varchar(2048),
    -- identifier parsed from the Google Maps link (fid:/cid:/pid:), used for duplicate detection
    google_place_ref varchar(220),
    created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS places_google_place_ref_key
    ON places (google_place_ref) WHERE google_place_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS places_lat_lng_idx ON places (latitude, longitude);

-- ---------- saved_places (a user's entry for a place) ----------
CREATE TABLE IF NOT EXISTS saved_places (
    saved_place_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    place_id       uuid NOT NULL REFERENCES places (place_id) ON DELETE RESTRICT,
    custom_name    varchar(120),
    status         varchar(10) NOT NULL DEFAULT 'wishlist'
                   CHECK (status IN ('wishlist', 'visited')),
    rating         numeric(2,1)
                   CHECK (rating IS NULL OR (rating BETWEEN 0.5 AND 5.0 AND rating * 2 = floor(rating * 2))),
    price_level    smallint CHECK (price_level IS NULL OR price_level BETWEEN 1 AND 4),
    notes          varchar(500),
    visited_at     date,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, place_id)
);
CREATE INDEX IF NOT EXISTS saved_places_user_idx ON saved_places (user_id, created_at DESC);
DROP TRIGGER IF EXISTS saved_places_set_updated_at ON saved_places;
CREATE TRIGGER saved_places_set_updated_at BEFORE UPDATE ON saved_places
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- tags (per user) ----------
CREATE TABLE IF NOT EXISTS tags (
    tag_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    name       varchar(30) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tags_user_name_lower_key ON tags (user_id, lower(name));

CREATE TABLE IF NOT EXISTS saved_place_tags (
    saved_place_id uuid NOT NULL REFERENCES saved_places (saved_place_id) ON DELETE CASCADE,
    tag_id         uuid NOT NULL REFERENCES tags (tag_id) ON DELETE CASCADE,
    PRIMARY KEY (saved_place_id, tag_id)
);
CREATE INDEX IF NOT EXISTS saved_place_tags_tag_idx ON saved_place_tags (tag_id);

-- ---------- geocode_cache (reverse geocoding results from Nominatim) ----------
CREATE TABLE IF NOT EXISTS geocode_cache (
    lat_key    numeric(8,5) NOT NULL,
    lng_key    numeric(8,5) NOT NULL,
    language   varchar(2)   NOT NULL,
    address    varchar(300) NOT NULL,
    created_at timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (lat_key, lng_key, language)
);

-- ---------- access control ----------
-- The Flask backend connects with the database owner role and enforces
-- per-user ownership in every query. Enabling RLS without policies blocks
-- Supabase's public REST/anon access to these tables.
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE places           ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_places     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_place_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE geocode_cache    ENABLE ROW LEVEL SECURITY;
