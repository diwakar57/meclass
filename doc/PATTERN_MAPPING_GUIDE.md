# Pattern Mapping: Existing ↔ Your Implementation

This document shows exactly how existing OpenMAIC patterns map to what you'll build for test attempts.

---

## 1. DATABASE TABLE MAPPING

### Existing: `quiz_attempts` (What's already there)
```sql
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY,
  student_id UUID,
  lesson_id UUID,          -- ← What lesson this quiz is in
  topic_id UUID,           -- ← What topic it covers
  school_id UUID,          -- ← TENANT ISOLATION
  
  score DECIMAL(5,2),      -- ← Final score (e.g., 85.50)
  max_score DECIMAL(5,2),  -- ← Usually 100
  time_taken_seconds INT,
  
  responses JSONB,         -- ← All student answers
  feedback JSONB,          -- ← Grading explanations
  
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP
);
```

### Your Task: `test_attempts` (Build on this pattern)
```sql
CREATE TABLE test_attempts (
  id UUID PRIMARY KEY,
  student_id UUID,
  test_id UUID,            -- ← Diagnostic/assessment test
  school_id UUID,          -- ← SAME: TENANT ISOLATION
  
  score DECIMAL(5,2),      -- ← SAME: 0-100 scale
  max_score DECIMAL(5,2),  -- ← SAME: usually 100
  time_taken_seconds INT,  -- ← SAME: track time
  
  responses JSONB,         -- ← SAME: store answers as JSON
  analysis JSONB,          -- ← NEW: AI-generated insights
  
  started_at TIMESTAMP,    -- ← SAME: track timeline
  completed_at TIMESTAMP,  -- ← SAME: completion time
  created_at TIMESTAMP     -- ← SAME: audit trail
);
```

**Principle:** Use the exact same column structure as `quiz_attempts`. 
You're essentially building on an existing, battle-tested pattern.

---

## 2. SERVICE LAYER MAPPING

### Existing: `diagnostic-test-service.ts`
```typescript
// Structure your service follows
export interface DiagnosticTest {
  id: string;
  student_id: string;
  questions: DiagnosticTestQuestion[];
}

export async function generateDiagnosticTest(
  studentId: string,
  schoolId: string,
  curriculumId: string,
  gradeLevel: number
): Promise<DiagnosticTest> {
  // 1. Query topics from curriculum
  const topicsResult = await query(...);
  
  // 2. Call LLM to generate questions
  const questionsResponse = await callLLM({...});
  
  // 3. Parse LLM response
  const questions = parseTestQuestions(questionsResponse, topicIds);
  
  // 4. Persist to database
  await query(`INSERT INTO diagnostic_tests ...`);
  
  // 5. Return domain object
  return { id, student_id, questions };
}
```

### Your Task: `test-attempt-service.ts`
```typescript
// Follow the EXACT same pattern, but for test attempts
export interface TestAttempt {
  id: string;
  student_id: string;
  responses: TestResponse[];  // ← What student answered
  score?: number;             // ← Their score
  analysis?: { /* ... */ };   // ← Analysis results
}

export async function submitTestAnswers(
  attemptId: string,
  responses: Array<{ questionId: string; answer: string }>,
  schoolId: string
): Promise<TestAttempt> {
  // 1. Query attempt & correct answers from DB
  const attemptResult = await query(
    `SELECT qa.*, q.questions FROM quiz_attempts qa
     JOIN quizzes q ON q.id = qa.test_id ...`
  );
  
  // 2. Grade each response (auto-grade MC, LLM for text)
  let totalScore = 0;
  for (const response of responses) {
    if (question.type === 'short_answer') {
      const gradeResult = await callLLM({ /* grade prompt */ });  // ← LLM grading
      totalScore += gradeResult.score;
    } else {
      // Auto-grade MC/true-false
      totalScore += (response.answer === question.correctAnswer ? 1 : 0);
    }
  }
  
  // 3. Update database with results
  await query(`UPDATE quiz_attempts SET score = ..., completed_at = NOW()`);
  
  // 4. Update topic_mastery (aggregated progress)
  await updateTopicMastery(studentId, topicId, schoolId, finalScore);
  
  // 5. Record learning patterns (for AI to learn student behavior)
  await recordLearningPatterns(studentId, schoolId, 'quiz', timeTakenSeconds);
  
  // 6. Return updated attempt
  return { id: attemptId, student_id: studentId, responses, score };
}

export async function analyzeTestAttempt(
  attemptId: string,
  schoolId: string
): Promise<TestAnalysis> {
  // 1. Get attempt details
  const attemptResult = await query(...);
  
  // 2. Build analysis prompt from responses
  const analysisPrompt = `
    Topic: ${topic}
    Score: ${score}%
    Responses: [list of correct/incorrect...]
    
    Provide: strengths, weaknesses, recommended topics, next steps
  `;
  
  // 3. Call LLM for analysis
  const analysis = await callLLM({ prompt: analysisPrompt });
  
  // 4. Return parsed analysis
  return parseAnalysis(analysis);
}
```

**Key Insight:** Both services follow:
1. Query existing data
2. Process (generate or grade)
3. Save results
4. Return domain object

---

## 3. REPOSITORY LAYER MAPPING

### Existing: `entity-repository.ts` Pattern
```typescript
export const schoolRepository = {
  // Pattern A: Create new record
  async create(data: { name: string; ... }): Promise<School> {
    const result = await query(
      `INSERT INTO schools (name, ...)
       VALUES ($1, ...)
       RETURNING *`,
      [data.name, ...]
    );
    return mapRowToSchool(result.rows[0]);  // ← Map DB row to domain object
  },

  // Pattern B: Get by ID
  async getById(id: string): Promise<School | null> {
    const result = await query(
      `SELECT ... FROM schools WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? mapRowToSchool(result.rows[0]) : null;
  },

  // Pattern C: List with pagination
  async list(limit = 50, offset = 0) {
    const result = await query(
      `SELECT ... FROM schools 
       WHERE deleted_at IS NULL 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows.map(mapRowToSchool);
  },

  // Pattern D: Update
  async update(id: string, data: Partial<School>): Promise<School | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    // ... repeat for each field

    values.push(id);
    const result = await query(
      `UPDATE schools 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING ...`,
      values
    );
    return result.rows[0] ? mapRowToSchool(result.rows[0]) : null;
  },

  // Pattern E: Mapping function
  // ↓ This is CRITICAL - converts DB rows to domain objects
  
};

function mapRowToSchool(row: any): School {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}
```

### Your Task: `test-attempt-repository.ts`
```typescript
// COPY the 5 patterns A-E above, but for test_attempts:

export const testAttemptRepository = {
  // A: Create
  async create(data: {
    studentId: string;
    testId: string;
    schoolId: string;
    maxScore: number;
  }): Promise<TestAttemptRow> {
    const id = crypto.randomUUID();
    const result = await query(
      `INSERT INTO quiz_attempts (
        id, student_id, test_id, school_id, started_at, max_score, responses
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6)
      RETURNING *`,
      [id, data.studentId, data.testId, data.schoolId, data.maxScore, '[]']
    );
    return result.rows[0];
  },

  // B: Get by ID (with school_id for tenant isolation)
  async getById(id: string, schoolId: string): Promise<TestAttemptRow | null> {
    const result = await query(
      `SELECT * FROM quiz_attempts 
       WHERE id = $1 AND school_id = $2`,  // ← CRITICAL: Always include school_id
      [id, schoolId]
    );
    return result.rows[0] || null;
  },

  // C: List with pagination
  async listByStudent(
    studentId: string,
    schoolId: string,
    limit = 50,
    offset = 0
  ): Promise<TestAttemptRow[]> {
    const result = await query(
      `SELECT * FROM quiz_attempts 
       WHERE student_id = $1 AND school_id = $2
       ORDER BY started_at DESC
       LIMIT $3 OFFSET $4`,  // ← CRITICAL: Include school_id in WHERE
      [studentId, schoolId, limit, offset]
    );
    return result.rows;
  },

  // D: Update (dynamic SQL for partial updates)
  async update(id: string, schoolId: string, data: Partial<TestAttemptRow>) {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.responses !== undefined) {
      updates.push(`responses = $${paramCount++}`);
      values.push(data.responses);
    }
    if (data.score !== undefined) {
      updates.push(`score = $${paramCount++}`);
      values.push(data.score);
    }
    if (data.completed_at !== undefined) {
      updates.push(`completed_at = $${paramCount++}`);
      values.push(data.completed_at);
    }

    values.push(id);
    values.push(schoolId);

    const result = await query(
      `UPDATE quiz_attempts
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND school_id = $${paramCount + 1}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  // E: Mapping function
  mapRowToAttempt(row: TestAttemptRow) {
    return {
      id: row.id,
      studentId: row.student_id,
      testId: row.test_id,
      schoolId: row.school_id,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      responses: JSON.parse(row.responses),
      score: row.score,
      maxScore: row.max_score,
    };
  },
};
```

**Key Principle:** 5 CRUD methods + 1 mapping function. That's it.

---

## 4. API ENDPOINT MAPPING

### Existing Path 1: `app/api/quiz-grade/route.ts` (Grading)
```typescript
export async function POST(req: NextRequest) {
  // Step 1: Validate input
  const body = await req.json();
  if (!body.question || !body.userAnswer) {
    return apiError('MISSING_FIELD', 400, '...');
  }

  // Step 2: Call LLM to grade
  const response = await callLLM({
    systemMessage: "You are an educational assessor...",
    userMessage: `Question: ...\nAnswer: ...`,
  });

  // Step 3: Parse JSON response
  const gradeResponse = JSON.parse(response);

  // Step 4: Validate and return
  return apiSuccess(gradeResponse);
}
```

### Your Pattern 1: `app/api/tests/[testId]/attempts/route.ts` (Start)
```typescript
export const POST = withRole(['student'], async (req, auth) => {
  try {
    // Step 1: Validate context
    if (!auth.schoolId) throw new Error('Missing school context');

    // Step 2: Call service to create attempt
    const attempt = await createTestAttempt(
      params.testId,
      auth.userId,
      auth.schoolId
    );

    // Step 3: Return success
    return NextResponse.json({ success: true, data: attempt }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create attempt', { error });
    return NextResponse.json({ error: '...' }, { status: 500 });
  }
});
```

### Existing Path 2: `app/api/student/analytics/route.ts` (Query + Transform)
```typescript
export const GET = withRole(['student'], async (_req, auth) => {
  // Step 1: Validate tenant
  if (!auth.schoolId) {
    return NextResponse.json(
      { success: false, error: 'Missing tenant' },
      { status: 401 }
    );
  }

  // Step 2: Query with filters (school_id + student_id)
  const data = await query(
    `SELECT ... FROM quiz_attempts 
     WHERE school_id = $1 AND student_id = $2`,  // ← CRITICAL
    [auth.schoolId, auth.userId]
  ).catch(() => ({ rows: [] }));  // ← GRACEFUL FALLBACK

  // Step 3: Transform data
  const transformed = data.rows.map(r => ({
    label: r.name,
    value: r.score,
  }));

  // Step 4: Return with standard format
  return NextResponse.json({
    success: true,
    data: transformed,
  });
});
```

### Your Pattern 2: `app/api/tests/attempts/[attemptId]/route.ts` (Submit)
```typescript
export const PUT = withRole(['student'], async (req, auth) => {
  try {
    // Step 1: Validate input
    const body = await req.json();
    if (!body.responses) {
      return apiError('MISSING_FIELD', 400, 'responses required');
    }

    // Step 2: Call service (does the grading)
    const result = await submitTestAnswers(
      params.attemptId,
      body.responses,
      auth.schoolId  // ← Always pass schoolId for tenant isolation
    );

    // Step 3: Return success
    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Failed to submit test', { error });
    return apiError('SUBMIT_FAILED', 500, 'Failed to submit');
  }
});
```

**Pattern:** Every endpoint follows:
1. Validate input/auth
2. Call service layer
3. Handle errors with logger
4. Return standardized JSON

---

## 5. TYPE DEFINITION MAPPING

### Existing: `lib/types/stage.ts`
```typescript
export interface QuizQuestion {
  id: string;
  type: 'single' | 'multiple' | 'short_answer';
  question: string;
  options?: QuizOption[];
  answer?: string[];  // Correct answers
  points?: number;
}

export interface QuizOption {
  label: string;
  value: string;  // "A", "B", "C"
}
```

### Your Types: `lib/types/tests.ts`
```typescript
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];        // For MC/TF
  correctAnswer?: string;
  points: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface TestResponse {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
}

export interface TestAttempt {
  id: string;
  studentId: string;
  testId: string;
  schoolId: string;
  startedAt: Date;
  completedAt?: Date;
  responses: TestResponse[];
  score?: number;
  maxScore: number;
  timeTakenSeconds?: number;
}

export interface TestAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendedTopics: string[];
  nextSteps: string[];
}
```

---

## 6. DASHBOARD MAPPING

### Existing: Student Dashboard
```typescript
interface StudentDashboard {
  overallProgress: number;
  masteryByTopic: Array<{ label: string; value: number }>;
  quizScoreHistory: Array<{ label: string; value: number }>;
  learningDNA: { paceType, mistakeType, preferredStyle };
}

// Usage:
<MetricsGrid columns={4}>
  <SummaryCard title="Overall Progress" value={`${progress}%`} />
  <SummaryCard title="Confidence" value={`${confidence}/100`} />
</MetricsGrid>

<ChartCard title="Progress Over Time">
  <EnhancedLineChart data={personalProgressOverTime} />
</ChartCard>
```

### Your Dashboard: Test Results View
```typescript
interface TestResultsDashboard {
  lastTestScore: number;
  averageScore: number;
  testHistory: Array<{ date: Date; score: number; topic: string }>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

// Usage: (Same pattern, just different data)
<MetricsGrid columns={3}>
  <SummaryCard title="Latest Test Score" value={`${lastScore}%`} />
  <SummaryCard title="Average Score" value={`${avgScore}%`} />
  <SummaryCard title="Tests Completed" value={testCount} />
</MetricsGrid>

<ChartCard title="Test Score Trend">
  <EnhancedLineChart data={testHistory} />
</ChartCard>
```

**Principle:** Use existing dashboard components. You're just feeding them different data.

---

## 7. COMPLETE MAPPING SUMMARY

| Layer | Existing | Your Build |
|-------|----------|-----------|
| **DB Table** | `quiz_attempts` | `test_attempts` (same structure) |
| **Service** | `diagnostic-test-service.ts` | `test-attempt-service.ts` |
| **Repo** | `entity-repository.ts` | `test-attempt-repository.ts` |
| **API** | `/api/quiz-grade/route.ts` | `/api/tests/attempts/route.ts` |
| **Types** | `lib/types/stage.ts` | `lib/types/tests.ts` |
| **Dashboard** | `app/dashboard/student/page.tsx` | Test results widget |
| **Auth** | `withRole(['student'])` | Same pattern |
| **Logging** | `createLogger('Module')` | Same pattern |
| **Errors** | `apiError()` / `apiSuccess()` | Same pattern |
| **Multi-tenancy** | `school_id` in WHERE | Same pattern |

---

## 🎯 The Key Insight

**You're not building anything new. You're building the exact same patterns OpenMAIC already uses, but applied to test attempts instead of quiz grades.**

Every layer:
- Validates input
- Checks schools/users
- Calls database
- Logs errors
- Returns standardized format

That's the entire architecture. Copy-paste the patterns, change the table names, you're done.

See [COPY_PASTE_IMPLEMENTATION_TEMPLATES.md](COPY_PASTE_IMPLEMENTATION_TEMPLATES.md) for templates.
