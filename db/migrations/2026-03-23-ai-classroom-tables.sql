/**
 * Database Migration: AI Classroom Integration Tables
 * 
 * Creates tables for:
 * - ai_classroom_sessions: Main session storage
 * - session_transcripts: Session transcripts
 * - session_interaction_logs: Interaction analytics
 * 
 * Date: 2026-03-23
 */

-- ============================================================================
-- TABLE: ai_classroom_sessions
-- Purpose: Store AI classroom session data
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_classroom_sessions (
  -- Primary key & identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type VARCHAR(50) DEFAULT 'ai_classroom_interactive',
  
  -- Multi-tenant & context
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  topic_id UUID NOT NULL,
  
  -- Customization applied
  difficulty_level INTEGER DEFAULT 5,
  teaching_style VARCHAR(50),
  duration_seconds INTEGER,
  
  -- Generated content URLs
  content_url VARCHAR(512),
  video_url VARCHAR(512),
  audio_url VARCHAR(512),
  transcript_url VARCHAR(512),
  
  -- Embedded JSONB data for flexibility
  scene_data JSONB,
  interaction_data JSONB,
  media_data JSONB,
  
  -- Status & lifecycle
  status VARCHAR(30) DEFAULT 'generated',  -- 'generated', 'started', 'completed', 'abandoned'
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Metadata for tracking
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_acs_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_acs_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_acs_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX idx_acs_school_student ON ai_classroom_sessions(school_id, student_id);
CREATE INDEX idx_acs_topic_status ON ai_classroom_sessions(topic_id, status);
CREATE INDEX idx_acs_created_at ON ai_classroom_sessions(created_at DESC);
CREATE INDEX idx_acs_student_created ON ai_classroom_sessions(student_id, created_at DESC);

-- ============================================================================
-- TABLE: session_transcripts
-- Purpose: Store complete transcripts of sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_transcripts (
  -- Primary key & foreign key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  school_id UUID NOT NULL,
  
  -- Transcript entries (JSONB for flexibility)
  -- Structure: { timestamp, speaker, text, type, sceneId, confidence }
  entries JSONB NOT NULL DEFAULT '[]',
  
  -- Full text content
  plain_text TEXT,
  word_count INTEGER DEFAULT 0,
  
  -- Metadata
  language VARCHAR(10),
  generated_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_st_session FOREIGN KEY (session_id) REFERENCES ai_classroom_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_st_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX idx_st_session_id ON session_transcripts(session_id);
CREATE INDEX idx_st_school_created ON session_transcripts(school_id, created_at DESC);

-- ============================================================================
-- TABLE: session_interaction_logs
-- Purpose: Detailed logs of student interactions for analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_interaction_logs (
  -- Primary key & foreign key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  school_id UUID NOT NULL,
  
  -- Log entries (JSONB)
  -- Structure: { timestamp, type, sceneId, duration, details }
  entries JSONB NOT NULL DEFAULT '[]',
  total_interactions INTEGER DEFAULT 0,
  
  -- Aggregated metrics
  avg_response_time_ms INTEGER,
  quiz_attempts INTEGER DEFAULT 0,
  help_requests INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_sil_session FOREIGN KEY (session_id) REFERENCES ai_classroom_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_sil_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX idx_sil_session_id ON session_interaction_logs(session_id);
CREATE INDEX idx_sil_school_created ON session_interaction_logs(school_id, created_at DESC);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. JSONB Columns:
--    - scene_data: Contains { totalScenes, scenes[] }
--    - interaction_data: Contains { quizData, discussionLog, userResponses }
--    - media_data: Contains { images[], generatedAssets[] }
--    - entries: Flexible structure for different entry types
--
-- 2. Status Values:
--    - 'generated': Session created, ready to play
--    - 'started': Student has started the session
--    - 'completed': Student has finished the session
--    - 'abandoned': Student left without completing
--
-- 3. Tenant Isolation:
--    - Always filter by school_id in queries (implicit in foreign keys)
--    - Multi-tenancy enforced at application layer
--
-- 4. Cascade Deletes:
--    - When school is deleted, all sessions deleted
--    - When student is deleted, all their sessions deleted
--    - When topic is deleted, sessions remain but topic ref becomes invalid
--
-- 5. JSONB Queries:
--    Query scene count: SELECT jsonb_array_length(scene_data->'scenes')
--    Filter by status: SELECT * WHERE interaction_data->>'status' = 'completed'
--    Search in transcript: SELECT * WHERE plain_text ILIKE '%keyword%'
