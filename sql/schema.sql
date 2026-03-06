-- ============================================================
-- Workato Hackathon MCP — full schema
-- Safe to re-run: all statements use IF NOT EXISTS
-- Run in Neon: SQL Editor → paste → Run
-- ============================================================

-- ── teams ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  track       text        NOT NULL,
  member_ids  uuid[]      NOT NULL DEFAULT '{}',
  event_id    uuid,                          -- set after hackathon_events exists
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── hackathon_events ─────────────────────────────────────────
-- Historic and future Workato-associated hackathon events
CREATE TABLE IF NOT EXISTS hackathon_events (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  year             int         NOT NULL,
  date_held        date,
  location         text,
  modality         text        CHECK (modality IN ('in-person','virtual','hybrid')),
  organizer        text,
  category         text        NOT NULL
                               CHECK (category IN ('internal','public','sponsored','university','enterprise','student')),
  theme            text,
  participant_count text,
  platform         text,
  source_url       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, year)
);

-- ── Link teams → hackathon_events ────────────────────────────
ALTER TABLE teams ADD COLUMN IF NOT EXISTS event_id    uuid   REFERENCES hackathon_events(id);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS member_ids  uuid[] NOT NULL DEFAULT '{}';

-- ── submissions ──────────────────────────────────────────────
-- Ensure event_id exists if table was created before hackathon_events

CREATE TABLE IF NOT EXISTS submissions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      uuid        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  event_id     uuid        REFERENCES hackathon_events(id),
  title        text        NOT NULL,
  description  text        NOT NULL,
  repo_url     text,
  demo_url     text,
  video_url    text,
  status       text        NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft','submitted','under_review','scored')),
  submitted_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES hackathon_events(id);

CREATE INDEX IF NOT EXISTS submissions_team_id_idx    ON submissions(team_id);
CREATE INDEX IF NOT EXISTS submissions_status_idx     ON submissions(status);
CREATE INDEX IF NOT EXISTS submissions_event_id_idx   ON submissions(event_id);

-- ── scores ───────────────────────────────────────────────────
-- judge_id references the registrations table (actual participants table)
CREATE TABLE IF NOT EXISTS scores (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid    NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  judge_id      uuid    NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  innovation    numeric NOT NULL CHECK (innovation    BETWEEN 0 AND 10),
  technical     numeric NOT NULL CHECK (technical     BETWEEN 0 AND 10),
  impact        numeric NOT NULL CHECK (impact        BETWEEN 0 AND 10),
  presentation  numeric NOT NULL CHECK (presentation  BETWEEN 0 AND 10),
  total         numeric NOT NULL CHECK (total         BETWEEN 0 AND 40),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, judge_id)
);

CREATE INDEX IF NOT EXISTS scores_submission_id_idx ON scores(submission_id);

-- ── awards ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS awards (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  description   text,
  prize         text,
  rank          int,
  event_id      uuid        REFERENCES hackathon_events(id),
  team_id       uuid        REFERENCES teams(id)       ON DELETE SET NULL,
  submission_id uuid        REFERENCES submissions(id) ON DELETE SET NULL,
  notes         text,
  awarded_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE awards ADD COLUMN IF NOT EXISTS event_id     uuid   REFERENCES hackathon_events(id);
ALTER TABLE awards ADD COLUMN IF NOT EXISTS name         text;
ALTER TABLE awards ADD COLUMN IF NOT EXISTS description  text;
ALTER TABLE awards ADD COLUMN IF NOT EXISTS prize        text;
ALTER TABLE awards ADD COLUMN IF NOT EXISTS rank         int;
ALTER TABLE awards ADD COLUMN IF NOT EXISTS team_id      uuid   REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE awards ADD COLUMN IF NOT EXISTS notes        text;

CREATE INDEX IF NOT EXISTS awards_event_id_idx ON awards(event_id);
