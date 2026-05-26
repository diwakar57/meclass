-- ============================================================================
-- AI School Platform - Multi-Tenant Database Schema
-- ============================================================================
-- Supports: SaaS Admin, Schools, Teachers, Students
-- Key Principle: All school-owned data includes school_id for tenant isolation

-- ============================================================================
-- 1. SCHOOLS & TENANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  logo_url VARCHAR(255),
  branding JSONB DEFAULT '{}',
  subscription_tier VARCHAR(50) DEFAULT 'basic', -- 'basic', 'premium', 'enterprise'
  max_students INTEGER DEFAULT 100,
  max_teachers INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_schools_domain ON schools(domain);
CREATE INDEX idx_schools_created_at ON schools(created_at DESC);

-- ============================================================================
-- 2. USERS (ALL ROLES: student, teacher, principal, accountant, saas_admin)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'student', 'teacher', 'principal', 'accountant', 'saas_admin'
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  avatar_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, email),
  UNIQUE(email) -- For global lookups (saas_admin emails are unique globally)
);

CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ============================================================================
-- 3. STUDENT PROFILES & LEARNING DATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade_level VARCHAR(50), -- 'K', '1', '2', ..., '12', 'college'
  interests TEXT[] DEFAULT '{}', -- ['math', 'science', 'history']
  strengths TEXT[] DEFAULT '{}',
  weak_areas TEXT[] DEFAULT '{}',
  learning_style VARCHAR(50), -- 'visual', 'auditory', 'kinesthetic', 'reading'
  language_preference VARCHAR(10) DEFAULT 'en-US',
  onboarding_completed BOOLEAN DEFAULT false,
  diagnostic_score DECIMAL,
  preferred_ai_teacher_persona VARCHAR(255) DEFAULT 'friendly_tutor',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_profiles_school_id ON student_profiles(school_id);
CREATE INDEX idx_student_profiles_grade_level ON student_profiles(grade_level);

-- ============================================================================
-- 4. CLASSES & ENROLLMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  grade_level VARCHAR(50),
  teacher_id UUID NOT NULL REFERENCES users(id),
  supervisor_id UUID REFERENCES users(id),
  description TEXT,
  max_students INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_grade_level ON classes(grade_level);

CREATE TABLE IF NOT EXISTS class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, student_id)
);

CREATE INDEX idx_class_enrollments_student_id ON class_enrollments(student_id);

-- ============================================================================
-- 5. CURRICULUM & TOPICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS curriculum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  grade_level VARCHAR(50),
  subject VARCHAR(255), -- 'math', 'science', 'english', etc.
  created_by_teacher_id UUID REFERENCES users(id),
  is_core BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_curriculum_school_id ON curriculum(school_id);
CREATE INDEX idx_curriculum_subject ON curriculum(subject);
CREATE INDEX idx_curriculum_grade_level ON curriculum(grade_level);

CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID NOT NULL REFERENCES curriculum(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  learning_objectives TEXT[], -- ['Understand fractions', 'Add fractions']
  grade_level VARCHAR(50),
  order_index INTEGER,
  estimated_duration_minutes INTEGER,
  prerequisites TEXT[], -- topic IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_topics_curriculum_id ON topics(curriculum_id);
CREATE INDEX idx_topics_school_id ON topics(school_id);
CREATE INDEX idx_topics_grade_level ON topics(grade_level);

-- ============================================================================
-- 5B. PHASE 1 SYLLABUS MANAGEMENT (GRADE + SUBJECT + VERSIONED SYLLABI)
-- ============================================================================

CREATE TABLE IF NOT EXISTS grade_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  level INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, level),
  UNIQUE(school_id, name)
);

CREATE INDEX idx_grade_levels_school_id ON grade_levels(school_id);
CREATE INDEX idx_grade_levels_level ON grade_levels(level);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, code),
  UNIQUE(school_id, name)
);

CREATE INDEX idx_subjects_school_id ON subjects(school_id);
CREATE INDEX idx_subjects_code ON subjects(code);

CREATE TABLE IF NOT EXISTS syllabi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade_id UUID NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'draft', -- draft|published|archived
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, grade_id, subject_id, version)
);

CREATE INDEX idx_syllabi_school_id ON syllabi(school_id);
CREATE INDEX idx_syllabi_grade_subject ON syllabi(grade_id, subject_id);
CREATE INDEX idx_syllabi_teacher_id ON syllabi(teacher_id);
CREATE INDEX idx_syllabi_status ON syllabi(status);

CREATE TABLE IF NOT EXISTS syllabus_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(syllabus_id, order_index)
);

CREATE INDEX idx_syllabus_units_syllabus_id ON syllabus_units(syllabus_id);

CREATE TABLE IF NOT EXISTS syllabus_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
  syllabus_unit_id UUID REFERENCES syllabus_units(id) ON DELETE SET NULL,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  source_grade_id UUID REFERENCES grade_levels(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(syllabus_id, order_index)
);

CREATE INDEX idx_syllabus_topics_syllabus_id ON syllabus_topics(syllabus_id);
CREATE INDEX idx_syllabus_topics_school_id ON syllabus_topics(school_id);

CREATE TABLE IF NOT EXISTS topic_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES syllabus_topics(id) ON DELETE CASCADE,
  depends_on_topic_id UUID REFERENCES syllabus_topics(id) ON DELETE CASCADE,
  depends_on_topic_name VARCHAR(255),
  depends_on_grade_id UUID REFERENCES grade_levels(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_topic_dependency_reference CHECK (
    depends_on_topic_id IS NOT NULL OR depends_on_topic_name IS NOT NULL
  )
);

CREATE INDEX idx_topic_dependencies_topic_id ON topic_dependencies(topic_id);
CREATE INDEX idx_topic_dependencies_dep_topic_id ON topic_dependencies(depends_on_topic_id);

CREATE TABLE IF NOT EXISTS syllabus_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  changed_by UUID REFERENCES users(id),
  change_note TEXT,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(syllabus_id, version)
);

CREATE INDEX idx_syllabus_versions_syllabus_id ON syllabus_versions(syllabus_id);

-- ============================================================================
-- 6. STUDENT LEARNING JOURNEY & MASTERY
-- ============================================================================

CREATE TABLE IF NOT EXISTS topic_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  mastery_score DECIMAL(5,2) DEFAULT 0, -- 0-100
  confidence_level DECIMAL(5,2) DEFAULT 0, -- 0-100
  attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  last_attempted_at TIMESTAMP,
  mastered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, topic_id)
);

CREATE INDEX idx_topic_mastery_student_id ON topic_mastery(student_id);
CREATE INDEX idx_topic_mastery_topic_id ON topic_mastery(topic_id);
CREATE INDEX idx_topic_mastery_mastery_score ON topic_mastery(mastery_score DESC);

CREATE TABLE IF NOT EXISTS learning_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  current_topic_id UUID REFERENCES topics(id),
  completed_topic_ids UUID[] DEFAULT '{}',
  in_progress_topic_ids UUID[] DEFAULT '{}',
  recommended_next_topic_ids UUID[] DEFAULT '{}',
  adaptive_difficulty DECIMAL(5,2) DEFAULT 1.0, -- scale factor for difficulty
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_learning_plans_school_id ON learning_plans(school_id);
CREATE INDEX idx_learning_plans_current_topic_id ON learning_plans(current_topic_id);

CREATE TABLE IF NOT EXISTS learning_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  pace_type VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (pace_type IN ('fast', 'medium', 'slow')),
  mistake_type VARCHAR(20) NOT NULL DEFAULT 'mixed' CHECK (mistake_type IN ('conceptual', 'careless', 'mixed')),
  preferred_style VARCHAR(20) NOT NULL DEFAULT 'interactive' CHECK (preferred_style IN ('visual', 'text', 'interactive', 'story')),
  attention_span_score DECIMAL(5,2) NOT NULL DEFAULT 50,
  recovery_rate DECIMAL(5,2) NOT NULL DEFAULT 50,
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_learning_dna_school_id ON learning_dna(school_id);

CREATE TABLE IF NOT EXISTS learning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  source VARCHAR(20) NOT NULL CHECK (source IN ('diagnostic', 'quiz', 'session')),
  pace_score DECIMAL(6,2) NOT NULL DEFAULT 50,
  attention_score DECIMAL(6,2) NOT NULL DEFAULT 50,
  retry_count INTEGER NOT NULL DEFAULT 0,
  observed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_learning_patterns_student_observed ON learning_patterns(student_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS mistake_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('diagnostic', 'quiz', 'session')),
  wrong_count INTEGER NOT NULL DEFAULT 0,
  conceptual_count INTEGER NOT NULL DEFAULT 0,
  careless_count INTEGER NOT NULL DEFAULT 0,
  mixed_count INTEGER NOT NULL DEFAULT 0,
  observed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mistake_patterns_student_observed ON mistake_patterns(student_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS learning_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  preferred_style VARCHAR(20) NOT NULL CHECK (preferred_style IN ('visual', 'text', 'interactive', 'story')),
  confidence DECIMAL(5,2) NOT NULL DEFAULT 50,
  source VARCHAR(20) NOT NULL CHECK (source IN ('profile', 'inferred', 'manual')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_learning_preferences_student_created ON learning_preferences(student_id, created_at DESC);

-- ============================================================================
-- 7. AI-GENERATED LESSONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  created_by_teacher_id UUID REFERENCES users(id),
  created_for_student_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  stage_data JSONB, -- Serialized AI classroom Stage object
  scenes_count INTEGER DEFAULT 0,
  language VARCHAR(10) DEFAULT 'en-US',
  difficulty_level DECIMAL(5,2) DEFAULT 1.0,
  ai_model_used VARCHAR(50), -- 'gpt-4', 'claude-3', etc.
  generation_time_seconds INTEGER,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lessons_school_id ON lessons(school_id);
CREATE INDEX idx_lessons_topic_id ON lessons(topic_id);
CREATE INDEX idx_lessons_created_by_teacher_id ON lessons(created_by_teacher_id);
CREATE INDEX idx_lessons_created_for_student_id ON lessons(created_for_student_id);

-- ============================================================================
-- 8. QUIZ ATTEMPTS & ASSESSMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  score DECIMAL(5,2),
  max_score DECIMAL(5,2) DEFAULT 100,
  time_taken_seconds INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  responses JSONB, -- [{ question_id, answer, is_correct }]
  feedback JSONB, -- { explanations, areas_for_improvement }
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX idx_quiz_attempts_lesson_id ON quiz_attempts(lesson_id);
CREATE INDEX idx_quiz_attempts_topic_id ON quiz_attempts(topic_id);
CREATE INDEX idx_quiz_attempts_school_id ON quiz_attempts(school_id);
CREATE INDEX idx_quiz_attempts_completed_at ON quiz_attempts(completed_at DESC);

-- ============================================================================
-- 9. ENGAGEMENT SIGNALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS engagement_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  signal_type VARCHAR(50) NOT NULL, -- 'inactivity', 'pause_resume', 'tool_switch', 'time_on_task'
  value DECIMAL(10,2),
  metadata JSONB, -- Additional context
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_engagement_signals_student_id ON engagement_signals(student_id);
CREATE INDEX idx_engagement_signals_lesson_id ON engagement_signals(lesson_id);
CREATE INDEX idx_engagement_signals_signal_type ON engagement_signals(signal_type);
CREATE INDEX idx_engagement_signals_recorded_at ON engagement_signals(recorded_at DESC);

-- ============================================================================
-- 10. SESSION & AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL, -- 'create', 'update', 'delete', 'login', etc.
  resource_type VARCHAR(100), -- 'user', 'lesson', 'quiz_attempt', etc.
  resource_id UUID,
  changes JSONB, -- Before/after state
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_school_id ON audit_logs(school_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================================================
-- 11. MEDIA & EXPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS lesson_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  export_format VARCHAR(50), -- 'pptx', 'html', 'pdf'
  file_url VARCHAR(255),
  file_size_bytes BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lesson_exports_lesson_id ON lesson_exports(lesson_id);
CREATE INDEX idx_lesson_exports_school_id ON lesson_exports(school_id);

-- ============================================================================
-- 12. TEACHER SYLLABI & COURSE GENERATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_syllabi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content_parsed JSONB NOT NULL, -- {chapters: [{title, topics: [{title, learningObjectives}]}]}
  format VARCHAR(50) NOT NULL, -- 'pdf', 'text', 'form'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teacher_syllabi_school_id ON teacher_syllabi(school_id);
CREATE INDEX idx_teacher_syllabi_teacher_id ON teacher_syllabi(teacher_id);
CREATE INDEX idx_teacher_syllabi_created_at ON teacher_syllabi(created_at DESC);

-- ============================================================================
-- 13. STUDENT COURSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  syllabus_id UUID NOT NULL REFERENCES teacher_syllabi(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500), -- /public/courses/{courseId}/index.html
  file_size INTEGER, -- bytes
  generation_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'generating', 'success', 'failed'
  error_message TEXT,
  generated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_school_id ON courses(school_id);
CREATE INDEX idx_courses_student_id ON courses(student_id);
CREATE INDEX idx_courses_syllabus_id ON courses(syllabus_id);
CREATE INDEX idx_courses_status ON courses(generation_status);
CREATE INDEX idx_courses_created_at ON courses(created_at DESC);

-- ============================================================================
-- 14. COURSE FILES (for large course storage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_course_files_course_id ON course_files(course_id);

-- ============================================================================
-- 15. AI CLASSROOM SESSIONS (Personalized AI Classroom Sessions)
-- ============================================================================
-- Stores generated AI classroom sessions per student-topic-difficulty combo
-- Core bridge between LearnAI platform and AI classroom engine

CREATE TABLE IF NOT EXISTS ai_classroom_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL, -- curriculum topic
  teaching_style VARCHAR(50) NOT NULL DEFAULT 'friendly', -- 'friendly', 'strict', 'storytelling', 'socratic'
  difficulty_level INTEGER DEFAULT 5, -- 1-10 scale adapted to student mastery
  video_url VARCHAR(500), -- URL to generated video lesson
  audio_url VARCHAR(500), -- URL to generated audio transcript
  transcript TEXT, -- Full lesson transcript
  duration_seconds INTEGER, -- Video/lesson duration
  learning_dna_applied JSONB, -- Story of student's pace/mistakes/style used in generation
  generation_prompt TEXT, -- Saved prompt for reproducibility
  generation_model VARCHAR(100) DEFAULT 'openai', -- Which LLM generated this
  session_metadata JSONB DEFAULT '{}', -- Additional metadata (engagement metrics, etc.)
  completed_at TIMESTAMP, -- When student finished this session
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_classroom_sessions_school_id ON ai_classroom_sessions(school_id);
CREATE INDEX idx_ai_classroom_sessions_student_id ON ai_classroom_sessions(student_id);
CREATE INDEX idx_ai_classroom_sessions_topic_id ON ai_classroom_sessions(topic_id);
CREATE INDEX idx_ai_classroom_sessions_teaching_style ON ai_classroom_sessions(teaching_style);
CREATE INDEX idx_ai_classroom_sessions_created_at ON ai_classroom_sessions(created_at DESC);
CREATE INDEX idx_ai_classroom_sessions_completed_at ON ai_classroom_sessions(completed_at);

-- ============================================================================
-- 16. DIAGNOSTIC TESTS (AI-Powered Assessment for Baseline Mastery)
-- ============================================================================
-- Stores diagnostic tests used to assess student baseline knowledge
-- Generates personalized questions based on curriculum and grade level

CREATE TABLE IF NOT EXISTS diagnostic_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  topic_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Topics covered in this test
  grade_level INTEGER NOT NULL,
  questions JSONB NOT NULL, -- Array of question objects
  estimated_duration_minutes INTEGER DEFAULT 30,
  score INTEGER, -- Final score (0-100)
  analysis JSONB, -- { strengths: [], weaknesses: [], recommended_topics: [], confidence_distribution: {} }
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_diagnostic_tests_school_id ON diagnostic_tests(school_id);
CREATE INDEX idx_diagnostic_tests_student_id ON diagnostic_tests(student_id);
CREATE INDEX idx_diagnostic_tests_curriculum_id ON diagnostic_tests(curriculum_id);
CREATE INDEX idx_diagnostic_tests_score ON diagnostic_tests(score);
CREATE INDEX idx_diagnostic_tests_completed_at ON diagnostic_tests(completed_at);
CREATE INDEX idx_diagnostic_tests_created_at ON diagnostic_tests(created_at DESC);

-- ============================================================================
-- 17. PARENT-STUDENT LINKS
-- ============================================================================
-- Maps parent accounts to student accounts for parent dashboard analytics

CREATE TABLE IF NOT EXISTS parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  relationship VARCHAR(50) DEFAULT 'parent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, student_id)
);

CREATE INDEX idx_parent_student_links_parent_id ON parent_student_links(parent_id);
CREATE INDEX idx_parent_student_links_student_id ON parent_student_links(student_id);
CREATE INDEX idx_parent_student_links_school_id ON parent_student_links(school_id);

-- ============================================================================
-- 18. SCHOOL MEMBERSHIPS & STUDENT JOIN REQUESTS
-- ============================================================================
-- Students are independent entities who request to join schools
-- Schools can approve/reject membership requests
-- A student can be a member of multiple schools

CREATE TABLE IF NOT EXISTS school_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'inactive'
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, school_id)
);

CREATE INDEX idx_school_memberships_student_id ON school_memberships(student_id);
CREATE INDEX idx_school_memberships_school_id ON school_memberships(school_id);
CREATE INDEX idx_school_memberships_status ON school_memberships(status);
CREATE INDEX idx_school_memberships_approved_at ON school_memberships(approved_at);
CREATE INDEX idx_school_memberships_created_at ON school_memberships(created_at DESC);

-- ============================================================================
-- 19. STUDENT JOIN REQUESTS
-- ============================================================================
-- Tracks student requests to join schools
-- School admin/principal can review and approve/reject

CREATE TABLE IF NOT EXISTS student_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  request_message TEXT,
  approval_message TEXT,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  membership_id UUID REFERENCES school_memberships(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, school_id)
);

CREATE INDEX idx_student_join_requests_student_id ON student_join_requests(student_id);
CREATE INDEX idx_student_join_requests_school_id ON student_join_requests(school_id);
CREATE INDEX idx_student_join_requests_status ON student_join_requests(status);
CREATE INDEX idx_student_join_requests_reviewed_at ON student_join_requests(reviewed_at);
CREATE INDEX idx_student_join_requests_created_at ON student_join_requests(created_at DESC);

-- ============================================================================
-- 20. STAFF PROFILES
-- ============================================================================
-- Detailed profiles for school staff: principal, teacher, accountant, supervisor
-- Different roles have different capabilities and data access

CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_role VARCHAR(50) NOT NULL, -- 'principal', 'teacher', 'accountant', 'supervisor'
  department VARCHAR(100),
  position_title VARCHAR(100),
  phone VARCHAR(20),
  office_location VARCHAR(255),
  qualifications TEXT,
  subject_expertise TEXT[], -- For teachers: ['math', 'science']
  bio TEXT,
  verified BOOLEAN DEFAULT false,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, user_id)
);

CREATE INDEX idx_staff_profiles_school_id ON staff_profiles(school_id);
CREATE INDEX idx_staff_profiles_user_id ON staff_profiles(user_id);
CREATE INDEX idx_staff_profiles_staff_role ON staff_profiles(staff_role);
CREATE INDEX idx_staff_profiles_verified ON staff_profiles(verified);

-- ============================================================================
-- 21. SCHOOL STAFF HIERARCHY
-- ============================================================================
-- Tracks reporting relationships within a school
-- Principal can oversee supervisors, supervisors oversee teachers, etc.

CREATE TABLE IF NOT EXISTS staff_reporting_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50), -- 'direct_supervisor', 'department_lead', 'mentor'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, staff_member_id, supervisor_id)
);

CREATE INDEX idx_staff_reporting_school_id ON staff_reporting_relationships(school_id);
CREATE INDEX idx_staff_reporting_staff_member_id ON staff_reporting_relationships(staff_member_id);
CREATE INDEX idx_staff_reporting_supervisor_id ON staff_reporting_relationships(supervisor_id);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) FOR MULTI-TENANCY
-- ============================================================================
-- NOTE: RLS policies should be applied per school_id for full tenant isolation
-- Example: ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "school_isolation" ON users
--   USING (school_id = current_setting('app.current_school_id')::uuid);

-- ============================================================================
-- 22. PHASE 2 LMS WORKFLOW TABLES
-- ============================================================================
-- Assignments, gradebook persistence, attendance tracking, and in-app messaging

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  class_label VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  max_score DECIMAL(7,2) NOT NULL DEFAULT 100,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assignments_school_id ON assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'not-submitted',
  score DECIMAL(7,2),
  submitted_at TIMESTAMP,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_school ON assignment_submissions(school_id);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'present',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_school ON attendance_records(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_class ON attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(attendance_date);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255),
  body TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_school ON messages(school_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ============================================================================
-- 23. PHASE 3 AI LEARNING PIPELINE COMPATIBILITY TABLES
-- ============================================================================
-- Adds missing persistence required for onboarding -> DNA -> plan -> session -> mastery.

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

ALTER TABLE topic_mastery
  ADD COLUMN IF NOT EXISTS mastery_level DECIMAL(5,2);

UPDATE topic_mastery
SET mastery_level = mastery_score
WHERE mastery_level IS NULL;

-- ============================================================================
-- 24. PHASE 4 SAAS MATURITY TABLES
-- ============================================================================
-- Billing lifecycle, API key governance, and persisted notifications/preferences.
-- We intentionally keep these tables ID-type agnostic (TEXT columns) so they work
-- with both UUID-backed and legacy TEXT-backed environments.

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS student_limit INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_schools_status ON schools(status);
CREATE INDEX IF NOT EXISTS idx_schools_subscription_status ON schools(subscription_status);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  school_id TEXT NOT NULL,
  invoice_number VARCHAR(255) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP,
  paid_date TIMESTAMP,
  pdf_url TEXT,
  stripe_invoice_id VARCHAR(255),
  notes TEXT,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoices_school ON invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  school_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  masked_key VARCHAR(255),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  last_used_at TIMESTAMP,
  rotated_at TIMESTAMP,
  revoked_at TIMESTAMP,
  UNIQUE(school_id, name)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_school ON api_keys(school_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

CREATE TABLE IF NOT EXISTS api_key_usage (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  api_key_id TEXT NOT NULL,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,
  response_time_ms INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_timestamp ON api_key_usage(timestamp DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  school_id TEXT,
  user_id TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'general',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  is_read BOOLEAN NOT NULL DEFAULT false,
  channels JSONB NOT NULL DEFAULT '["in_app"]'::jsonb,
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  email_status VARCHAR(30),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  user_id TEXT NOT NULL UNIQUE,
  school_id TEXT,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  quiz_completion BOOLEAN NOT NULL DEFAULT true,
  parent_updates BOOLEAN NOT NULL DEFAULT true,
  teacher_alerts BOOLEAN NOT NULL DEFAULT true,
  payment_receipts BOOLEAN NOT NULL DEFAULT true,
  milestone_completions BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_school_id ON notification_preferences(school_id);
