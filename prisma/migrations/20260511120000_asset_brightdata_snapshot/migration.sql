-- Add Bright Data scrape snapshot column to assets.
-- Stores the normalized payload (caption, hashtags, audio, duration, etc.)
-- captured by /api/assets/[id]/refresh-brightdata. Nullable; existing rows
-- stay untouched until they're refreshed.

ALTER TABLE "assets"
  ADD COLUMN "brightdata_snapshot" JSONB,
  ADD COLUMN "brightdata_synced_at" TIMESTAMPTZ;
