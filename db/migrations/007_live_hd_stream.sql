ALTER TABLE live_sessions
  ADD COLUMN IF NOT EXISTS stream_url_hd TEXT;
