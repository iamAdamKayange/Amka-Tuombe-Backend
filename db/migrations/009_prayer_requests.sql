CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(160) NOT NULL DEFAULT 'Mgeni',
  phone VARCHAR(40),
  email VARCHAR(320),
  message TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS full_name VARCHAR(160) DEFAULT 'Mgeni';
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS phone VARCHAR(40);
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS email VARCHAR(320);
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'new';
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE prayer_requests
SET full_name = COALESCE(full_name, 'Mgeni'),
    status = COALESCE(status, 'new'),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, created_at, NOW());

CREATE INDEX IF NOT EXISTS prayer_requests_created_at_idx
  ON prayer_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS prayer_requests_status_idx
  ON prayer_requests (status, created_at DESC);

DROP TRIGGER IF EXISTS prayer_requests_set_updated_at ON prayer_requests;
CREATE TRIGGER prayer_requests_set_updated_at BEFORE UPDATE ON prayer_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
