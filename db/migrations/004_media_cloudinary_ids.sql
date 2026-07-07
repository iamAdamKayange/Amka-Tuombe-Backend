ALTER TABLE teachings
  ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;

ALTER TABLE audio_sermons
  ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;

CREATE INDEX IF NOT EXISTS teachings_cloudinary_id_idx
  ON teachings (cloudinary_public_id)
  WHERE cloudinary_public_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audio_cloudinary_id_idx
  ON audio_sermons (cloudinary_public_id)
  WHERE cloudinary_public_id IS NOT NULL;
