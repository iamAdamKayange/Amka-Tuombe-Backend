CREATE TABLE IF NOT EXISTS push_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  platform TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_device_tokens_active_idx
  ON push_device_tokens (is_active, last_seen_at DESC);

DROP TRIGGER IF EXISTS push_device_tokens_set_updated_at ON push_device_tokens;
CREATE TRIGGER push_device_tokens_set_updated_at BEFORE UPDATE ON push_device_tokens
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
