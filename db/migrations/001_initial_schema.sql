CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(320);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(160);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

CREATE TABLE IF NOT EXISTS teachings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(240) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT,
  video_url TEXT,
  thumbnail TEXT,
  duration TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'processing',
  likes_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE teachings ADD COLUMN IF NOT EXISTS title VARCHAR(240);
ALTER TABLE teachings ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE teachings ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE teachings ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE teachings ADD COLUMN IF NOT EXISTS thumbnail TEXT;
ALTER TABLE teachings ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE teachings ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'processing';
ALTER TABLE teachings ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE teachings ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE teachings ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE teachings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE teachings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE teachings
SET url = COALESCE(url, video_url),
    video_url = COALESCE(video_url, url),
    status = COALESCE(status, 'completed'),
    likes_count = COALESCE(likes_count, 0),
    views_count = COALESCE(views_count, 0),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, created_at, NOW());

CREATE INDEX IF NOT EXISTS teachings_feed_idx
  ON teachings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS teachings_creator_idx ON teachings (created_by);

CREATE TABLE IF NOT EXISTS audio_sermons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(240) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  audio_url TEXT NOT NULL,
  duration TEXT,
  thumbnail TEXT,
  plays_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audio_sermons ADD COLUMN IF NOT EXISTS title VARCHAR(240);
ALTER TABLE audio_sermons ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE audio_sermons ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE audio_sermons ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE audio_sermons ADD COLUMN IF NOT EXISTS thumbnail TEXT;
ALTER TABLE audio_sermons ADD COLUMN IF NOT EXISTS plays_count INTEGER DEFAULT 0;
ALTER TABLE audio_sermons ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE audio_sermons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE audio_sermons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE audio_sermons
SET plays_count = COALESCE(plays_count, 0),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, created_at, NOW());

CREATE INDEX IF NOT EXISTS audio_sermons_feed_idx ON audio_sermons (created_at DESC);
CREATE INDEX IF NOT EXISTS audio_sermons_creator_idx ON audio_sermons (created_by);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teaching_id UUID NOT NULL REFERENCES teachings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS teaching_id UUID;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS content VARCHAR(500);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS comments_teaching_feed_idx
  ON comments (teaching_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_user_idx ON comments (user_id);

CREATE TABLE IF NOT EXISTS likes (
  teaching_id UUID NOT NULL REFERENCES teachings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (teaching_id, user_id)
);

ALTER TABLE likes ADD COLUMN IF NOT EXISTS teaching_id UUID;
ALTER TABLE likes ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE likes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS likes_teaching_user_unique_idx
  ON likes (teaching_id, user_id);
CREATE INDEX IF NOT EXISTS likes_user_idx ON likes (user_id);

CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(240) NOT NULL,
  stream_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS title VARCHAR(240);
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS stream_url TEXT;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS live_sessions_active_idx
  ON live_sessions (is_active, started_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS teachings_set_updated_at ON teachings;
CREATE TRIGGER teachings_set_updated_at BEFORE UPDATE ON teachings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS audio_sermons_set_updated_at ON audio_sermons;
CREATE TRIGGER audio_sermons_set_updated_at BEFORE UPDATE ON audio_sermons
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS comments_set_updated_at ON comments;
CREATE TRIGGER comments_set_updated_at BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS live_sessions_set_updated_at ON live_sessions;
CREATE TRIGGER live_sessions_set_updated_at BEFORE UPDATE ON live_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
