# Implementation Patterns Guide: Test Attempts & Analysis

> A comprehensive guide to existing test, diagnostic, assessment, and quiz structures in OpenMAIC

---

## 1. DATABASE SCHEMA FOR TESTS/ASSESSMENTS

### Core Test Tables

#### `quiz_attempts` - Main Quiz Response Tracking
```sql
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY,
  student_id UUID (references users),
  lesson_id UUID (references lessons),
  topic_id UUID (references topics),
  school_id UUID (references schools) -- TENANT ISOLATION
  
  -- Response Data
  score DECIMAL(5,2),                   -- e.g., 85.50
  max_score DECIMAL(5,2) DEFAULT 100,
  time_taken_seconds INTEGER,
  responses JSONB,                      -- [{ question_id, answer, is_correct }]
  feedback JSONB,                       -- { explanations, areas_for_improvement }
  
  -- Timestamps
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP
);

KEY INDEXES:
  - idx_quiz_attempts_student_id
  - idx_quiz_attempts_lesson_id
  - idx_quiz_attempts_topic_id
  - idx_quiz_attempts_school_id
  - idx_quiz_attempts_completed_at (for analytics)
```

#### `topic_mastery` - Aggregated Progress Per Topic
```sql
CREATE TABLE topic_mastery (
  id UUID PRIMARY KEY,
  student_id UUID (references users),
  topic_id UUID (references topics),
  school_id UUID (references schools) -- TENANT ISOLATION
  
  -- Accumulating Metrics
  mastery_score DECIMAL(5,2) DEFAULT 0,     -- 0-100 aggregate
  confidence_level DECIMAL(5,2) DEFAULT 0,  -- 0-100 from responses
  attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  last_attempted_at TIMESTAMP,
  mastered_at TIMESTAMP,                    -- When score >= 80%
  
  UNIQUE(student_id, topic_id)
);
```

#### `learning_patterns` - Behavioral Metrics
```sql
CREATE TABLE learning_patterns (
  id UUID PRIMARY KEY,
  student_id UUID,
  school_id UUID,
  
  -- Source indicates where pattern was observed
  source VARCHAR(20) CHECK (source IN ('diagnostic', 'quiz', 'session')),
  
  -- Measured Traits
  pace_score DECIMAL(6,2) DEFAULT 50,       -- How fast they complete
  attention_score DECIMAL(6,2) DEFAULT 50,  -- Focus duration
  retry_count INTEGER DEFAULT 0,            -- Attempts needed
  observed_at TIMESTAMP,                    -- When this session occurred
  
  created_at TIMESTAMP
);

KEY: Used to feed into learning_dna profile updates
```

#### `mistake_patterns` - Error Analysis
```sql
CREATE TABLE mistake_patterns (
  id UUID PRIMARY KEY,
  student_id UUID,
  school_id UUID,
  topic_id UUID,
  
  source VARCHAR(20) CHECK (source IN ('diagnostic', 'quiz', 'session')),
  
  -- Error Categorization
  wrong_count INTEGER DEFAULT 0,        -- Total wrong answers
  conceptual_count INTEGER DEFAULT 0,   -- Lack of understanding
  careless_count INTEGER DEFAULT 0,     -- Arithmetic/typo errors
  mixed_count INTEGER DEFAULT 0,        -- Multiple error types
  observed_at TIMESTAMP,
  
  created_at TIMESTAMP
);

INSIGHT: Use this to determine remediation strategy
```

#### `learning_preferences` - Student Style Detection
```sql
CREATE TABLE learning_preferences (
  id UUID PRIMARY KEY,
  student_id UUID,
  school_id UUID,
  
  -- Detected/Inferred Preference
  preferred_style VARCHAR(20) CHECK (
    preferred_style IN ('visual', 'text', 'interactive', 'story')
  ),
  
  -- Source of Information
  source VARCHAR(20) CHECK (source IN ('profile', 'inferred', 'manual')),
  confidence DECIMAL(5,2) DEFAULT 50,  -- 0-100 confidence level
  created_at TIMESTAMP
);

INSIGHT: Use to recommend lesson delivery format
```

#### `learning_dna` - Student Learning Profile
```sql
CREATE TABLE learning_dna (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL UNIQUE,
  school_id UUID,
  
  -- Core Traits (computed from learning_patterns)
  pace_type VARCHAR(20) CHECK (pace_type IN ('fast', 'medium', 'slow')),
  mistake_type VARCHAR(20) CHECK (mistake_type IN ('conceptual', 'careless', 'mixed')),
  preferred_style VARCHAR(20) CHECK (preferred_style IN ('visual', 'text', 'interactive', 'story')),
  
  -- Metrics (0-100 scale)
  attention_span_score DECIMAL(5,2) DEFAULT 50,
  recovery_rate DECIMAL(5,2) DEFAULT 50,  -- How quickly they recover from mistakes
  
  last_updated TIMESTAMP,
  created_at TIMESTAMP
);

INSIGHT: Single-record profile updated after each assessment
```

---

## 2. TYPE DEFINITIONS (lib/types/)

### Quiz Types (stage.ts)
```typescript
export interface QuizQuestion {
  id: string;
  type: 'single' | 'multiple' | 'short_answer';  // Response type
  question: string;                                 // Question text
  options?: QuizOption[];                          // MC/Multiple only
  answer?: string[];                               // Correct: ["A"], ["A","C"]
  analysis?: string;                               // Explanation shown after
  commentPrompt?: string;                          // Guidance for grading text
  hasAnswer?: boolean;                             // Whether auto-grade possible
  points?: number;                                 // Default 1 point
}

export interface QuizOption {
  label: string;  // Display: "Option A"
  value: string;  // Internal: "A"
}

export interface QuizContent {
  type: 'quiz';
  questions: QuizQuestion[];
}
```

### Diagnostic Test Types (diagnostic-test-service.ts)
```typescript
export interface DiagnosticTestQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'true_false';
  options?: string[];              // For MC
  correct_answer: string;          // Single correct answer
  difficulty_level: number;        // 1-10 scale
  topic_id: string;               // What this tests
  explanation: string;            // Remedial explanation
  concept_key: string;            // Indexed for analytics
}

export interface DiagnosticTest {
  id: string;
  school_id: string;              // Tenant isolation
  student_id: string;
  curriculum_id: string;          // Curriculum being assessed
  topic_ids: string[];            // Topics covered in test
  grade_level: number;            // For context
  questions: DiagnosticTestQuestion[];
  estimated_duration_minutes: number;
  
  // After completion
  completed_at?: string;
  score?: number;                 // Final % score
  analysis?: {
    strengths: string[];
    weaknesses: string[];
    recommended_topics: string[];
    confidence_distribution: Record<string, number>;
  };
}
```

### Generation Types (generation.ts)
```typescript
export interface GeneratedQuizContent {
  questions: QuizQuestion[];
}

export interface SuggestedQuizQuestion {
  type: 'single' | 'multiple' | 'short_answer';
  questionOutline: string;
  suggestedOptions?: string[];
  targetConceptId?: string;
  difficulty: 'easy' | 'medium' | 'hard';       // For adaptive learning
}
```

---

## 3. SERVICE PATTERNS (lib/services/)

### Pattern: DiagnosticTestService

**File:** [lib/services/diagnostic-test-service.ts](lib/services/diagnostic-test-service.ts)

```typescript
// ============================================================================
// PATTERN: Service Layer Structure
// ============================================================================

/**
 * 1. Define Interfaces
 */
export interface DiagnosticTest { /* ... */ }
export interface DiagnosticTestQuestion { /* ... */ }

/**
 * 2. Implement Service Functions
 * - Each function focused on ONE responsibility
 * - Async/await pattern for DB calls
 * - Error logging with createLogger()
 * - Proper null checks
 */

export async function generateDiagnosticTest(
  studentId: string,
  schoolId: string,
  curriculumId: string,
  gradeLevel: number,
  topicLimit: number = 10
): Promise<DiagnosticTest> {
  try {
    // Step 1: Fetch curriculum topics from DB
    const topicsResult = await query(
      `SELECT id, name, description, concepts FROM topics 
       WHERE curriculum_id = $1 
       ORDER BY sequence ASC 
       LIMIT $2`,
      [curriculumId, topicLimit]
    );

    if (topicsResult.rows.length === 0) {
      throw new Error('No topics found for curriculum');
    }

    // Step 2: Use LLM to generate questions
    const questionsPrompt = buildDiagnosticPrompt(topics, gradeLevel);
    const questionsResponse = await callLLM({
      model: 'default',
      prompt: questionsPrompt,
      temperature: 0.7,
      maxTokens: 3000,
    });

    // Step 3: Parse LLM response into structured questions
    const questions = parseTestQuestions(questionsResponse, topicIds);

    // Step 4: Persist to database
    const testId = crypto.randomUUID();
    await query(
      `INSERT INTO diagnostic_tests (...) VALUES (...)`,
      [testId, schoolId, studentId, ...]
    );

    // Step 5: Return domain object
    return {
      id: testId,
      school_id: schoolId,
      student_id: studentId,
      // ...
    };
  } catch (error) {
    logger.error('Failed to generate diagnostic test', { error });
    throw error;  // Re-throw for API to handle
  }
}

export async function getDiagnosticTest(testId: string): Promise<DiagnosticTest | null> {
  try {
    const result = await query(
      `SELECT * FROM diagnostic_tests WHERE id = $1`,
      [testId]
    );
    return result.rows.length === 0 ? null : mapRowToTest(result.rows[0]);
  } catch (error) {
    logger.error('Failed to get diagnostic test', { error });
    throw error;
  }
}

export async function listStudentDiagnosticTests(
  studentId: string,
  schoolId: string
): Promise<DiagnosticTest[]> {
  // Implementation...
}
```

**KEY PATTERNS:**
- ✅ Separate concerns: data access, business logic, LLM calls
- ✅ Always include `school_id` filtering for multi-tenancy
- ✅ Use `createLogger()` for structured logging
- ✅ Throw errors for API to handle
- ✅ Return domain objects (not raw DB rows)
- ✅ Provide both create and query functions

---

## 4. REPOSITORY PATTERNS (lib/repositories/)

### Pattern: EntityRepository Structure

**File:** [lib/repositories/entity-repository.ts](lib/repositories/entity-repository.ts)

```typescript
/**
 * Repository Layer Pattern
 * Pure data access layer - no business logic
 */

export const schoolRepository = {
  // ========== CREATE ==========
  async create(data: {
    name: string;
    domain?: string;
    logoUrl?: string;
    subscriptionTier?: SubscriptionTier;
  }): Promise<School> {
    const result = await query(
      `INSERT INTO schools (name, domain, logo_url, subscription_tier, ...)
       VALUES ($1, $2, $3, $4, ...)
       RETURNING id, name, domain, ...`,
      [data.name, data.domain || null, data.logoUrl || null, ...]
    );
    
    if (!result.rows[0]) throw new Error('Failed to create school');
    return mapRowToSchool(result.rows[0]);
  },

  // ========== READ ==========
  async getById(id: string): Promise<School | null> {
    const result = await query(
      'SELECT id, name, domain, ... FROM schools WHERE id = $1',
      [id]
    );
    return result.rows[0] ? mapRowToSchool(result.rows[0]) : null;
  },

  // ========== LIST ==========
  async list(limit = 50, offset = 0) {
    const result = await query(
      'SELECT ... FROM schools WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows.map(mapRowToSchool);
  },

  // ========== UPDATE ==========
  async update(id: string, data: Partial<School>): Promise<School | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    // ... more fields

    values.push(id);
    const result = await query(
      `UPDATE schools SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING ...`,
      values
    );

    return result.rows[0] ? mapRowToSchool(result.rows[0]) : null;
  },

  // ========== DELETE ==========
  async delete(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE schools SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }
};

// ========== Mapping Function ==========
function mapRowToSchool(row: any): School {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    logoUrl: row.logo_url,
    subscriptionTier: row.subscription_tier as SubscriptionTier,
    maxStudents: row.max_students,
    maxTeachers: row.max_teachers,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}
```

**KEY PATTERNS:**
- ✅ Object-based repositories (grouped by entity)
- ✅ Pure CRUD methods with NO business logic
- ✅ Mapping layer converts DB rows → domain objects
- ✅ Soft deletes (WHERE deleted_at IS NULL)
- ✅ Parameterized queries (prevent SQL injection)

---

## 5. API ENDPOINT PATTERNS (app/api/)

### Pattern 1: Quiz Grading Endpoint

**File:** [app/api/quiz-grade/route.ts](app/api/quiz-grade/route.ts)

```typescript
/**
 * POST /api/quiz-grade
 * Grade a short-answer question using LLM
 * Called for questions that can't be auto-graded
 */

import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import { apiError, apiSuccess } from '@/lib/server/api-response';

interface GradeRequest {
  question: string;           // The question text
  userAnswer: string;         // Student's answer
  points: number;             // Max points
  commentPrompt?: string;     // Scoring guidance
  language?: string;          // 'en' or 'zh-CN'
}

interface GradeResponse {
  score: number;              // 0 to points
  comment: string;            // Feedback
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GradeRequest;
    const { question, userAnswer, points, commentPrompt, language } = body;

    // 1. Validate Input
    if (!question || !userAnswer) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 
        'question and userAnswer are required');
    }

    // 2. Resolve Model from Headers
    const { model: languageModel } = resolveModelFromHeaders(req);

    // 3. Build LLM Prompt
    const isZh = language === 'zh-CN';
    const systemPrompt = isZh
      ? `你是一位专业的教育评估专家...`
      : `You are a professional educational assessor...`;

    // 4. Call LLM
    const response = await callLLM({
      model: languageModel,
      systemMessage: systemPrompt,
      userMessage: `Question: ${question}\nStudent Answer: ${userAnswer}`,
      temperature: 0.3,
      maxTokens: 200,
    });

    // 5. Parse Response
    const gradeResponse: GradeResponse = JSON.parse(response);

    // 6. Validate Score Range
    if (gradeResponse.score < 0 || gradeResponse.score > points) {
      return apiError('INVALID_GRADE', 400, 
        `Score must be between 0 and ${points}`);
    }

    // 7. Return Success
    return apiSuccess(gradeResponse);
  } catch (error) {
    log.error('Quiz grading failed', { error });
    return apiError('GRADING_FAILED', 500, 'Failed to grade response');
  }
}
```

**KEY PATTERNS:**
- ✅ Input validation FIRST
- ✅ Structured request/response interfaces
- ✅ Error handling with standardized responses
- ✅ Use `apiError()` / `apiSuccess()` utilities
- ✅ Comments explaining each step

### Pattern 2: Authenticated Analytics Endpoint

**File:** [app/api/student/analytics/route.ts](app/api/student/analytics/route.ts)

```typescript
/**
 * GET /api/student/analytics
 * Get student's learning analytics
 * 
 * Auth: Student can only view own data
 * Tenant Isolation: Filters by school_id
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';

// 1. Define Response Type
interface StudentAnalyticsResponse {
  personalProgressOverTime: Array<{ label: string; value: number }>;
  masteryByTopic: Array<{ label: string; value: number }>;
  quizScoreHistory: Array<{ label: string; value: number }>;
  learningDNA: {
    paceType: string;
    mistakeType: string;
    preferredStyle: string;
    confidenceScore: number;
  };
  // ...
}

// 2. Export Handler with Auth Middleware
export const GET = withRole(['student'], async (
  _req: NextRequest,
  auth: AuthContext  // Injected by middleware
) => {
  try {
    // 3. Validate Tenant Context
    if (!auth.schoolId) {
      return NextResponse.json(
        { success: false, error: 'Missing tenant scope' },
        { status: 401 }
      );
    }

    const studentId = auth.userId;
    const schoolId = auth.schoolId;

    // 4. Query with Tenant Isolation
    const personalProgressOverTime = await safeMonthlySeries(
      'quiz_attempts',
      'completed_at',
      6,  // Last 6 months
      'WHERE school_id = $1 AND student_id = $2',  // CRITICAL: school_id filter
      [schoolId, studentId]
    );

    // 5. Query Mastery Data
    const masteryByTopicResult = await query(
      `SELECT COALESCE(t.title, 'Topic') AS topic,
              COALESCE(tm.mastery_score, 0)::float AS mastery
       FROM topic_mastery tm
       LEFT JOIN topics t ON t.id = tm.topic_id
       WHERE tm.school_id = $1 AND tm.student_id = $2
       ORDER BY tm.updated_at DESC
       LIMIT 10`,
      [schoolId, studentId]
    ).catch(() => ({ rows: [] }));  // Graceful fallback

    // 6. Get Learning DNA Profile
    const learningDNA = await LearningDNAService.getLearningDNA(studentId)
      .catch(() => null);

    // 7. Transform & Return
    return NextResponse.json({
      success: true,
      data: {
        personalProgressOverTime,
        masteryByTopic: masteryByTopicResult.rows.map(r => ({
          label: String(r.topic),
          value: Number(r.mastery || 0),
        })),
        learningDNA: learningDNA || { /* defaults */ },
        // ...
      },
    });
  } catch (error) {
    log.error('Analytics fetch failed', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
});
```

**KEY PATTERNS:**
- ✅ Use `withRole()` middleware for auth + multi-tenancy
- ✅ ALWAYS include `school_id` in WHERE clauses
- ✅ Graceful fallback for DB failures (`.catch()`)
- ✅ Type response data with interface
- ✅ Return standardized JSON: `{ success, data/error }`

### Pattern 3: Diagnostic Test Endpoint

**File:** [app/api/diagnostic-test/[id]/route.ts](app/api/diagnostic-test/[id]/route.ts)

```typescript
/**
 * GET /api/diagnostic-test/[id]
 * Get a specific diagnostic test
 * 
 * GET /api/diagnostic-test
 * List student's tests
 */

export async function GET(
  req: NextRequest,
  { params }: { params?: { id?: string } } = {}
) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Check Auth
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get User's School (Tenant Isolation)
    const userResult = await query(
      `SELECT school_id FROM users WHERE id = $1`,
      [session.user.id]
    );

    const { school_id } = userResult.rows[0];

    // 3. Handle Specific Test Request
    if (params?.id) {
      const test = await getDiagnosticTest(params.id);

      if (!test) {
        return NextResponse.json({ error: 'Test not found' }, { status: 404 });
      }

      // 4. Check Authorization
      if (
        test.student_id !== session.user.id &&
        !['principal', 'teacher', 'saas_admin'].includes(session.user.role)
      ) {
        return NextResponse.json(
          { error: 'Not authorized to view this test' },
          { status: 403 }
        );
      }

      return NextResponse.json(test, { status: 200 });
    }

    // 5. List for Student
    const tests = await listStudentDiagnosticTests(
      session.user.id,
      school_id
    );

    return NextResponse.json(
      {
        tests,
        total: tests.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to get diagnostic test', { error });
    return NextResponse.json(
      { error: 'Failed to get test' },
      { status: 500 }
    );
  }
}
```

**KEY PATTERNS:**
- ✅ Handle both specific ([id]) and list requests in same route
- ✅ Check authorization at field level (student can see own, teacher can see class)
- ✅ Standardized error responses with proper HTTP status
- ✅ Use service functions for business logic

---

## 6. DASHBOARD STRUCTURES

### Student Dashboard Pattern

**File:** [app/dashboard/student/page.tsx](app/dashboard/student/page.tsx)

```typescript
'use client';  // React Client Component

import { useState, useEffect } from 'react';
import {
  SummaryCard, MetricsGrid, ChartCard, ProgressRing, EmptyState
} from '@/components/dashboard/dashboard-components';
import {
  EnhancedLineChart, EnhancedBarChart, EnhancedDonutChart
} from '@/components/dashboard/advanced-charts';

interface StudentAnalytics {
  overallProgress: number;
  schoolCount: number;
  personalProgressOverTime: Array<{ label: string; value: number }>;
  masteryByTopic: Array<{ label: string; value: number }>;
  completedVsPendingLessons: { completed: number; pending: number };
  quizScoreHistory: Array<{ label: string; value: number }>;
  learningDNA: {
    paceType: string;
    mistakeType: string;
    preferredStyle: string;
    confidenceScore: number;
  };
  streakStatus: { currentStreak: number; bestStreak: number };
}

export default function StudentDashboard() {
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Data on Mount
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/student/analytics', {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setAnalytics(data.data);
      } catch (err) {
        log.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
    
    // 2. Refresh Every 60 Seconds
    const interval = setInterval(fetchAnalytics, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!analytics)
    return <EmptyState title="No data available" description="Check back soon" />;

  // 3. Render Dashboard Layout
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header>
          <h1 className="text-4xl font-bold text-gray-900">
            My Learning Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Track your progress across schools and topics
          </p>
        </header>

        {/* 4. Key Metrics Grid */}
        <MetricsGrid columns={4}>
          <SummaryCard
            title="Overall Progress"
            value={`${Math.round(analytics.overallProgress)}%`}
            icon="🎯"
            backgroundColor="bg-blue-50"
          />
          <SummaryCard
            title="Schools Enrolled"
            value={analytics.schoolCount}
            unit="active"
            icon="🏫"
            backgroundColor="bg-green-50"
          />
          <SummaryCard
            title="Current Streak"
            value={analytics.streakStatus.currentStreak}
            unit="days"
            icon="🔥"
            backgroundColor="bg-orange-50"
          />
          <SummaryCard
            title="Confidence Score"
            value={`${Math.round(analytics.learningDNA.confidenceScore)}/100`}
            icon="⭐"
            backgroundColor="bg-purple-50"
          />
        </MetricsGrid>

        {/* 5. Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Progress Over Time" description="Last 6 months">
            <EnhancedLineChart
              data={analytics.personalProgressOverTime}
              color="#3b82f6"
            />
          </ChartCard>

          <ChartCard title="Mastery by Topic" description="Current scores">
            <EnhancedBarChart
              data={analytics.masteryByTopic}
              color="#10b981"
            />
          </ChartCard>
        </div>

        {/* Additional Sections... */}
      </div>
    </main>
  );
}
```

**PATTERN: COMPONENTS USED**
- ✅ `SummaryCard` - Single metric display
- ✅ `MetricsGrid` - Responsive grid layout
- ✅ `ChartCard` - Wrapper for charts
- ✅ `EnhancedLineChart` - Trend visualization
- ✅ `EnhancedBarChart` - Category comparison
- ✅ `EnhancedDonutChart` - Distribution view
- ✅ `ProgressRing` - Circular progress indicator

**PATTERN: DATA FLOW**
1. Fetch from `/api/student/analytics` on mount
2. Parse response into typed interface
3. Render using reusable components
4. Auto-refresh every 60s

### Teacher Dashboard Pattern

**File:** [app/dashboard/teacher/page.tsx](app/dashboard/teacher/page.tsx)

```typescript
interface TeacherAnalytics {
  totalStudents: number;
  avgClassScore: number;
  engagementPercentage: number;
  studentProgressTrend: Array<{ label: string; value: number }>;
  topicMasteryChart: Array<{ label: string; value: number }>;
  weakTopicHeatmap: Array<{ student: string; topic: string; value: number }>;
  quizPerformanceDistribution: Array<{ label: string; value: number }>;
  assignmentCompletion: { completed: number; total: number };
  atRiskStudents: Array<{ id: string; name: string; riskScore: number }>;
}

// Layout:
// 1. Alerts Panel - Shows at-risk students
// 2. Metrics Grid - Class-level KPIs
// 3. Progress Charts - Trend over time
// 4. Heatmap - Which topics are weak for who
// 5. Data Table - At-risk students detail
```

---

## KEY ARCHITECTURAL TAKEAWAYS

### Multi-Tenancy Pattern
```
Every table has school_id column →
Every query includes WHERE school_id = $X →
No inter-school data leakage
```

### Auth Pattern
```typescript
// All endpoints use:
export const GET = withRole(['student'], async (req, auth) => {
  // auth.userId, auth.schoolId provided
  // Only students with role='student' can call
});
```

### Error Handling Pattern
```typescript
try {
  // Business logic
} catch (error) {
  logger.error('Operation failed', { error });
  return apiError('ERROR_CODE', 500, 'User-friendly message');
}
```

### Data Mapping Pattern
```typescript
// DB Row → Domain Object
function mapRowToStudent(row: any): Student {
  return {
    id: row.id,
    name: row.first_name + ' ' + row.last_name,
    email: row.email,
    // Transform as needed
  };
}
```

---

## Summary: What You Should Build

Based on these patterns, implement:

1. **New Tables**
   - `test_attempts` (similar to `quiz_attempts`)
   - `test_analysis` (store computed insights)

2. **Service Layer** [lib/services/test-attempt-service.ts]
   - `createTestAttempt()`
   - `completeTestAttempt()`
   - `analyzeTestAttempt()`

3. **Repository Layer** [lib/repositories/test-attempt-repository.ts]
   - Pure CRUD operations
   - Mapping functions

4. **API Endpoints**
   - `POST /api/tests/[testId]/attempts` - Start attempt
   - `PUT /api/tests/attempts/[attemptId]` - Submit response
   - `GET /api/tests/attempts/[attemptId]/analysis` - Get analysis

5. **Dashboard Components**
   - Test progress widget
   - Performance analysis charts
   - Recommendation explanations

6. **Type Definitions** [lib/types/tests.ts]
   - `TestAttempt`, `TestResponse`, `TestAnalysis`, etc.

All following existing patterns above! ✅
