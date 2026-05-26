/**
 * Database Migration: Phase 3 AI Learning Pipeline
 *
 * Goal:
 * - Close schema gaps for onboarding, adaptive plans, AI sessions, and confidence workflows.
 * - Keep compatibility with existing data model variants already present in production/dev DBs.
 *
 * Date: 2026-03-26
 */

-- ============================================================================
-- 1) COURSE + LEARNING PLAN COMPATIBILITY
-- ============================================================================

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS grade_id UUID REFERENCES grade_levels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS total_estimated_sessions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_grade_id ON courses(grade_id);
CREATE INDEX IF NOT EXISTS idx_courses_class_id ON courses(class_id);
CREATE INDEX IF NOT EXISTS idx_courses_subject_id ON courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_courses_status_v2 ON courses(status);

CREATE TABLE IF NOT EXISTS course_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  class_schedule JSONB NOT NULL DEFAULT '{}',
  holidays JSONB NOT NULL DEFAULT '[]',
  no_class_dates JSONB NOT NULL DEFAULT '[]',
  course_end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_calendars_school_id ON course_calendars(school_id);
CREATE INDEX IF NOT EXISTS idx_course_calendars_course_id ON course_calendars(course_id);

CREATE TABLE IF NOT EXISTS course_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_sessions INTEGER NOT NULL DEFAULT 1,
  assessment_strategy VARCHAR(30) NOT NULL DEFAULT 'quiz',
  depends_on_topic_ids JSONB NOT NULL DEFAULT '[]',
  learning_objectives JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(30) NOT NULL DEFAULT 'planned',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_course_topics_course_id ON course_topics(course_id);
CREATE INDEX IF NOT EXISTS idx_course_topics_school_id ON course_topics(school_id);
CREATE INDEX IF NOT EXISTS idx_course_topics_order_index ON course_topics(order_index);

ALTER TABLE learning_plans
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS learning_dna_id UUID REFERENCES learning_dna(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS based_on_syllabus_id UUID REFERENCES teacher_syllabi(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_syllabus JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS personalized_syllabus JSONB DEFAULT '{"remediationTopics":[],"mainTopics":[]}',
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS projected_completion_date DATE,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_learning_plans_course_id ON learning_plans(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_plans_learning_dna_id ON learning_plans(learning_dna_id);
CREATE INDEX IF NOT EXISTS idx_learning_plans_status ON learning_plans(status);

CREATE TABLE IF NOT EXISTS scheduled_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_plan_id UUID NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time JSONB,
  is_remediation_class BOOLEAN NOT NULL DEFAULT false,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 45,
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scheduled_classes_plan_id ON scheduled_classes(learning_plan_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_topic_id ON scheduled_classes(topic_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_date ON scheduled_classes(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_status ON scheduled_classes(status);

CREATE TABLE IF NOT EXISTS learning_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  predicted_mastery_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  confidence_level DECIMAL(5,2) NOT NULL DEFAULT 0,
  predicted_outcome VARCHAR(30) NOT NULL DEFAULT 'on_track',
  risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
  target_date DATE,
  model_version VARCHAR(30) NOT NULL DEFAULT 'rule_v1',
  input_snapshot JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_predictions_student_id ON learning_predictions(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_predictions_school_id ON learning_predictions(school_id);
CREATE INDEX IF NOT EXISTS idx_learning_predictions_topic_id ON learning_predictions(topic_id);
CREATE INDEX IF NOT EXISTS idx_learning_predictions_risk_level ON learning_predictions(risk_level);

-- ============================================================================
-- 2) ONBOARDING + DIAGNOSTIC COMPATIBILITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_onboardings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1,
  completed_steps JSONB NOT NULL DEFAULT '[]',
  current_grade VARCHAR(50),
  previous_grade VARCHAR(50),
  self_assessment JSONB,
  diagnostic_test_id UUID,
  diagnostic_score DECIMAL(5,2),
  diagnostic_completed_at TIMESTAMP,
  learning_dna_id UUID REFERENCES learning_dna(id) ON DELETE SET NULL,
  learning_plan_id UUID REFERENCES learning_plans(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_student_onboardings_student_id ON student_onboardings(student_id);
CREATE INDEX IF NOT EXISTS idx_student_onboardings_school_id ON student_onboardings(school_id);
CREATE INDEX IF NOT EXISTS idx_student_onboardings_status ON student_onboardings(status);

ALTER TABLE diagnostic_tests
  ADD COLUMN IF NOT EXISTS previous_grade_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_grade VARCHAR(50),
  ADD COLUMN IF NOT EXISTS student_responses JSONB,
  ADD COLUMN IF NOT EXISTS analysis_result JSONB,
  ADD COLUMN IF NOT EXISTS took_time INTEGER,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS type VARCHAR(30) DEFAULT 'diagnostic';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'diagnostic_tests' AND column_name = 'curriculum_id'
  ) THEN
    BEGIN
      ALTER TABLE diagnostic_tests ALTER COLUMN curriculum_id DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN
      NULL;
    END;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'diagnostic_tests' AND column_name = 'grade_level'
  ) THEN
    BEGIN
      ALTER TABLE diagnostic_tests ALTER COLUMN grade_level DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN
      NULL;
    END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES diagnostic_tests(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  answer_type VARCHAR(30) NOT NULL DEFAULT 'multiple_choice',
  options JSONB,
  correct_answer TEXT,
  correct_answer_id TEXT,
  points_value INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_topic_id ON test_questions(topic_id);

ALTER TABLE learning_dna
  ADD COLUMN IF NOT EXISTS generation_method VARCHAR(30) DEFAULT 'diagnostic',
  ADD COLUMN IF NOT EXISTS diagnostic_confidence DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS reported_confidence DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS confidence_alignment VARCHAR(30),
  ADD COLUMN IF NOT EXISTS learning_profile JSONB,
  ADD COLUMN IF NOT EXISTS remediation_needed JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- ============================================================================
-- 3) AI SESSION + TRANSCRIPT + PROCESSING
-- ============================================================================

ALTER TABLE ai_classroom_sessions
  ADD COLUMN IF NOT EXISTS session_type VARCHAR(50) DEFAULT 'ai_classroom_interactive',
  ADD COLUMN IF NOT EXISTS content_url VARCHAR(512),
  ADD COLUMN IF NOT EXISTS transcript_url VARCHAR(512),
  ADD COLUMN IF NOT EXISTS scene_data JSONB,
  ADD COLUMN IF NOT EXISTS interaction_data JSONB,
  ADD COLUMN IF NOT EXISTS media_data JSONB,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'generated',
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_acs_status ON ai_classroom_sessions(status);
CREATE INDEX IF NOT EXISTS idx_acs_generated_at ON ai_classroom_sessions(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_acs_session_type ON ai_classroom_sessions(session_type);

CREATE TABLE IF NOT EXISTS session_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_classroom_sessions(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  entries JSONB NOT NULL DEFAULT '[]',
  plain_text TEXT,
  word_count INTEGER DEFAULT 0,
  language VARCHAR(10) DEFAULT 'en-US',
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_transcripts_school_id ON session_transcripts(school_id);
CREATE INDEX IF NOT EXISTS idx_session_transcripts_created_at ON session_transcripts(created_at DESC);

CREATE TABLE IF NOT EXISTS session_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_classroom_sessions(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  entries JSONB NOT NULL DEFAULT '[]',
  total_interactions INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  quiz_attempts INTEGER DEFAULT 0,
  help_requests INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_interaction_logs_school_id ON session_interaction_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_session_interaction_logs_created_at ON session_interaction_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS ai_session_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_classroom_sessions(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  accuracy_rate DECIMAL(6,2) NOT NULL DEFAULT 0,
  response_time_ms INTEGER,
  engagement_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  quality_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  mastery_delta DECIMAL(6,3) NOT NULL DEFAULT 0,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_session_results_school_id ON ai_session_results(school_id);
CREATE INDEX IF NOT EXISTS idx_ai_session_results_student_id ON ai_session_results(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_session_results_topic_id ON ai_session_results(topic_id);
CREATE INDEX IF NOT EXISTS idx_ai_session_results_quality_score ON ai_session_results(quality_score DESC);

-- ============================================================================
-- 4) TEST ATTEMPTS + CONFIDENCE ANALYSIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS test_attempts (
  id TEXT PRIMARY KEY,
  quiz_attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES diagnostic_tests(id) ON DELETE CASCADE,
  test_name VARCHAR(255) NOT NULL,
  test_type VARCHAR(30) NOT NULL DEFAULT 'diagnostic',
  status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP,
  completed_at TIMESTAMP,
  time_allowed_minutes INTEGER,
  total_points INTEGER NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  percentage_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  performance_status VARCHAR(30) NOT NULL DEFAULT 'not_yet_attempted',
  total_questions_answered INTEGER NOT NULL DEFAULT 0,
  total_questions_correct INTEGER NOT NULL DEFAULT 0,
  answers_json JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_attempts_student_id ON test_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_school_id ON test_attempts(school_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_status ON test_attempts(status);
CREATE INDEX IF NOT EXISTS idx_test_attempts_started_at ON test_attempts(started_at DESC);

CREATE TABLE IF NOT EXISTS topic_performance_by_attempt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_attempt_id TEXT NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  percentage_correct DECIMAL(6,2) NOT NULL DEFAULT 0,
  performance_status VARCHAR(30) NOT NULL DEFAULT 'not_yet_attempted',
  average_confidence DECIMAL(6,2) NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  average_student_confidence DECIMAL(6,2) NOT NULL DEFAULT 0,
  actual_percentage_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  mismatch_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  mismatch_type VARCHAR(30) NOT NULL DEFAULT 'well_calibrated',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_topic_perf_attempt_id ON topic_performance_by_attempt(test_attempt_id);
CREATE INDEX IF NOT EXISTS idx_topic_perf_school_id ON topic_performance_by_attempt(school_id);
CREATE INDEX IF NOT EXISTS idx_topic_perf_topic_id ON topic_performance_by_attempt(topic_id);

-- ============================================================================
-- 5) TOPIC MASTERY COMPATIBILITY
-- ============================================================================

ALTER TABLE topic_mastery
  ADD COLUMN IF NOT EXISTS mastery_level DECIMAL(5,2);

UPDATE topic_mastery
SET mastery_level = mastery_score
WHERE mastery_level IS NULL;
