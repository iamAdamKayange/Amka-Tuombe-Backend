ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE teachings ADD COLUMN IF NOT EXISTS downloads_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments (parent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_pinned_idx ON comments (teaching_id, is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS comment_likes_user_idx ON comment_likes (user_id);
