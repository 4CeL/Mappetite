-- ============================================================
-- Mappetite — 002_opening_hours.sql
-- Adds optional opening/closing time to a saved restaurant.
-- Run in the Supabase SQL Editor after 001_init.sql. Safe to re-run.
-- ============================================================

-- Hours are entered by the user (no free, reliable data source exists), so they live on
-- saved_places (per user) rather than on the shared `places` row.
ALTER TABLE saved_places
    ADD COLUMN IF NOT EXISTS opens_at  time,
    ADD COLUMN IF NOT EXISTS closes_at time;

COMMENT ON COLUMN saved_places.opens_at  IS 'Opening time, same every day. NULL = unknown. opens_at = closes_at means open 24 hours.';
COMMENT ON COLUMN saved_places.closes_at IS 'Closing time; may be earlier than opens_at when the place closes after midnight.';

-- Either both times are set or neither is.
ALTER TABLE saved_places DROP CONSTRAINT IF EXISTS saved_places_hours_both_or_neither;
ALTER TABLE saved_places
    ADD CONSTRAINT saved_places_hours_both_or_neither
    CHECK ((opens_at IS NULL) = (closes_at IS NULL));
