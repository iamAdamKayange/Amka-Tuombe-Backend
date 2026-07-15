ALTER TABLE push_device_tokens
  ADD COLUMN IF NOT EXISTS install_cutoff_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS push_device_tokens_install_cutoff_idx
  ON push_device_tokens (install_cutoff_at DESC);
