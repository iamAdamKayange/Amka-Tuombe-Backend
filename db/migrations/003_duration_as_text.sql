ALTER TABLE teachings
  ALTER COLUMN duration TYPE TEXT
  USING duration::TEXT;

ALTER TABLE audio_sermons
  ALTER COLUMN duration TYPE TEXT
  USING duration::TEXT;
