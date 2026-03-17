CREATE TABLE IF NOT EXISTS posts (
  id VARCHAR(50) PRIMARY KEY,
  platform VARCHAR(20) NOT NULL,
  author VARCHAR(100),
  region VARCHAR(20),
  content TEXT,
  type VARCHAR(20),
  timestamp TIMESTAMPTZ,
  source VARCHAR(50),
  raw_url TEXT,
  upvotes INTEGER DEFAULT 0,
  is_answered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  region VARCHAR(20),
  join_date TIMESTAMPTZ,
  post_count INTEGER DEFAULT 0,
  is_champion BOOLEAN DEFAULT FALSE,
  is_ambassador BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(username, platform)
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id VARCHAR(50) REFERENCES posts(id) ON DELETE CASCADE,
  tag VARCHAR(50),
  PRIMARY KEY (post_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform);
CREATE INDEX IF NOT EXISTS idx_posts_region ON posts(region);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_timestamp ON posts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_members_platform ON members(platform);
