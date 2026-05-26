-- =============================================================================
-- AISchool Extended Feature Schema Migration
-- Version: 2.0.0
-- Features: Live Classroom, District Dashboard, Marketplace, Offline Mode,
--           Proctoring & Exam Integrity
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Districts (multi-school grouping)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS districts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  country     TEXT,
  region      TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link schools to districts
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES districts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_schools_district_id ON schools(district_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- FEATURE 1: Live Video Classroom
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS live_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  course_id           UUID REFERENCES courses(id) ON DELETE SET NULL,
  teacher_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','live','ended','cancelled')),
  livekit_room_name   TEXT NOT NULL DEFAULT '',
  livekit_room_token  TEXT,
  recording_url       TEXT,
  transcript          TEXT,
  ai_summary          TEXT,
  participant_count   INTEGER NOT NULL DEFAULT 0,
  started_at          TIMESTAMPTZ,
  ended_at            TIMESTAMPTZ,
  scheduled_at        TIMESTAMPTZ,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_school_id   ON live_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher_id  ON live_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status      ON live_sessions(status);

CREATE TABLE IF NOT EXISTS live_session_participants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role               TEXT NOT NULL CHECK (role IN ('teacher','student','observer')),
  joined_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at            TIMESTAMPTZ,
  connection_quality TEXT CHECK (connection_quality IN ('good','fair','poor')),
  UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_session_participants_session ON live_session_participants(session_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- FEATURE 2: District Analytics (aggregation tables)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS district_metrics_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id     UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,  -- NULL = district-wide
  metric_name     TEXT NOT NULL,
  metric_value    NUMERIC NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_district_metrics_district ON district_metrics_snapshots(district_id);
CREATE INDEX IF NOT EXISTS idx_district_metrics_school   ON district_metrics_snapshots(school_id);
CREATE INDEX IF NOT EXISTS idx_district_metrics_period   ON district_metrics_snapshots(period_start, period_end);

-- Dropout risk cache (refreshed by analytics job)
CREATE TABLE IF NOT EXISTS dropout_risk_cache (
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  risk_score      INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  factors         JSONB NOT NULL DEFAULT '{}',
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, school_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- FEATURE 3: AI Course Marketplace
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id         UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  school_id         UUID REFERENCES schools(id) ON DELETE SET NULL,
  creator_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_type      TEXT NOT NULL CHECK (creator_type IN ('ai','teacher')),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  thumbnail_url     TEXT,
  price_cents       INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency          TEXT NOT NULL DEFAULT 'USD',
  tags              JSONB NOT NULL DEFAULT '[]',
  avg_rating        NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (avg_rating BETWEEN 0 AND 5),
  review_count      INTEGER NOT NULL DEFAULT 0,
  enrollment_count  INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','published','archived')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_status       ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_creator      ON marketplace_listings(creator_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_rating       ON marketplace_listings(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_enrollment   ON marketplace_listings(enrollment_count DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_tags         ON marketplace_listings USING GIN(tags);

CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  reviewer_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS marketplace_enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  paid_cents    INTEGER NOT NULL DEFAULT 0,
  enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress_pct  INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  completed_at  TIMESTAMPTZ,
  UNIQUE (listing_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_enrollments_student ON marketplace_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_enrollments_listing ON marketplace_enrollments(listing_id);

-- Revenue tracking
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id   UUID NOT NULL REFERENCES marketplace_enrollments(id) ON DELETE CASCADE,
  listing_id      UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gross_cents     INTEGER NOT NULL,
  platform_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 20.00, -- 20% platform cut
  creator_payout_cents INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  status          TEXT NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('pending','completed','refunded')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- FEATURE 4: Offline Mode
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS offline_sync_log (
  client_id         TEXT PRIMARY KEY,   -- UUID generated client-side
  type              TEXT NOT NULL,
  entity_id         TEXT NOT NULL,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payload           JSONB NOT NULL DEFAULT '{}',
  client_timestamp  TIMESTAMPTZ NOT NULL,
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offline_sync_user   ON offline_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_synced ON offline_sync_log(synced_at DESC);

-- Student progress (used for offline delta sync)
CREATE TABLE IF NOT EXISTS student_progress (
  student_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic_id            UUID REFERENCES course_topics(id) ON DELETE SET NULL,
  progress_pct        INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  time_spent_seconds  INTEGER NOT NULL DEFAULT 0,
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, course_id, topic_id)
);

-- Student notes (offline-syncable)
CREATE TABLE IF NOT EXISTS student_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  course_id   UUID REFERENCES courses(id) ON DELETE SET NULL,
  content     TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Offline sync flag for quiz_attempts (add column if table exists)
ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS is_offline_sync BOOLEAN NOT NULL DEFAULT FALSE;

-- Offline sync flag for assignment_submissions
ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS is_offline_sync BOOLEAN NOT NULL DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- FEATURE 5: Proctoring & Exam Integrity
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS proctoring_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_attempt_id     UUID NOT NULL,  -- references test_attempts or quiz_attempts
  student_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  exam_id             UUID NOT NULL,  -- generic; references quiz or assignment
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','flagged','completed','voided')),
  suspicion_score     INTEGER NOT NULL DEFAULT 0 CHECK (suspicion_score BETWEEN 0 AND 100),
  event_count         INTEGER NOT NULL DEFAULT 0,
  high_severity_count INTEGER NOT NULL DEFAULT 0,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at            TIMESTAMPTZ,
  report_hash         TEXT,   -- SHA-256 of report JSON for tamper detection
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proctoring_student ON proctoring_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_school  ON proctoring_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_status  ON proctoring_sessions(status);
CREATE INDEX IF NOT EXISTS idx_proctoring_score   ON proctoring_sessions(suspicion_score DESC);

CREATE TABLE IF NOT EXISTS proctoring_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  severity     TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  details      JSONB NOT NULL DEFAULT '{}',
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proctoring_events_session   ON proctoring_events(session_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_events_type      ON proctoring_events(event_type);
CREATE INDEX IF NOT EXISTS idx_proctoring_events_severity  ON proctoring_events(severity);
CREATE INDEX IF NOT EXISTS idx_proctoring_events_time      ON proctoring_events(occurred_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Last-active tracking (used for dropout risk computation)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- course_topics (required by student_progress FK if not present)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_topics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
