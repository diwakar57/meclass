# Quick Reference: Copy-Paste Patterns

This file provides ready-to-use code templates based on OpenMAIC's existing patterns.

---

## 1. SERVICE LAYER TEMPLATE

**File:** `lib/services/test-attempt-service.ts`

```typescript
/**
 * Test Attempt Service
 * Handles test submission, grading, and analysis
 */

import { query } from '@/lib/db';
import { callLLM } from '@/lib/ai/providers';
import { createLogger } from '@/lib/logger';

const logger = createLogger('TestAttemptService');

// ============================================================================
// TYPES
// ============================================================================

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
  
  // Progress
  startedAt: Date;
  completedAt?: Date;
  
  // Responses & Scores
  responses: TestResponse[];
  score?: number;          // Final score (0-100)
  maxScore: number;
  timeTakenSeconds?: number;
  
  // Analysis (after completion)
  analysis?: {
    strengths: string[];
    weaknesses: string[];
    recommendedTopics: string[];
    nextSteps: string[];
  };
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Start a test attempt
 */
export async function createTestAttempt(
  testId: string,
  studentId: string,
  schoolId: string
): Promise<TestAttempt> {
  try {
    // Step 1: Verify test exists
    const testResult = await query(
      `SELECT id, questions, max_score FROM quizzes WHERE id = $1 AND school_id = $2`,
      [testId, schoolId]
    );

    if (testResult.rows.length === 0) {
      throw new Error('Test not found');
    }

    const test = testResult.rows[0];

    // Step 2: Create attempt record
    const attemptId = crypto.randomUUID();
    const now = new Date();

    await query(
      `INSERT INTO quiz_attempts (
        id, student_id, test_id, school_id, started_at, responses, max_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        attemptId,
        studentId,
        testId,
        schoolId,
        now,
        JSON.stringify([]),  // Empty responses initially
        test.max_score,
      ]
    );

    logger.info(`Test attempt created: ${attemptId}`);

    return {
      id: attemptId,
      studentId,
      testId,
      schoolId,
      startedAt: now,
      responses: [],
      maxScore: test.max_score,
    };
  } catch (error) {
    logger.error('Failed to create test attempt', { error, testId, studentId });
    throw error;
  }
}

/**
 * Submit answers and grade the test
 */
export async function submitTestAnswers(
  attemptId: string,
  responses: Array<{
    questionId: string;
    answer: string;
  }>,
  schoolId: string
): Promise<TestAttempt> {
  try {
    // Step 1: Get test and attempt details
    const attemptResult = await query(
      `SELECT qa.id, qa.student_id, qa.test_id, qa.started_at, q.questions, q.max_score
       FROM quiz_attempts qa
       JOIN quizzes q ON q.id = qa.test_id
       WHERE qa.id = $1 AND qa.school_id = $2`,
      [attemptId, schoolId]
    );

    if (attemptResult.rows.length === 0) {
      throw new Error('Attempt not found');
    }

    const attempt = attemptResult.rows[0];
    const questions = JSON.parse(attempt.questions);

    // Step 2: Grade each response
    const gradedResponses: TestResponse[] = [];
    let totalScore = 0;

    for (const response of responses) {
      const question = questions.find((q: any) => q.id === response.questionId);

      if (!question) continue;

      let isCorrect = false;
      let earnedPoints = 0;

      if (question.type === 'short_answer') {
        // Grade with LLM
        const gradeResult = await gradeShortAnswer(
          question.question,
          response.answer,
          question.points || 1
        );
        isCorrect = gradeResult.score > (question.points || 1) * 0.5;
        earnedPoints = gradeResult.score;
      } else if (
        question.type === 'multiple_choice' ||
        question.type === 'true_false'
      ) {
        // Auto-grade
        isCorrect = response.answer === question.correctAnswer;
        earnedPoints = isCorrect ? (question.points || 1) : 0;
      }

      gradedResponses.push({
        questionId: response.questionId,
        userAnswer: response.answer,
        isCorrect,
        earnedPoints,
        maxPoints: question.points || 1,
      });

      totalScore += earnedPoints;
    }

    // Step 3: Calculate final score
    const finalScore = (totalScore / attempt.max_score) * 100;
    const completedAt = new Date();
    const timeTakenSeconds = Math.floor(
      (completedAt.getTime() - attempt.started_at.getTime()) / 1000
    );

    // Step 4: Update attempt in database
    await query(
      `UPDATE quiz_attempts
       SET responses = $1, score = $2, completed_at = $3, time_taken_seconds = $4
       WHERE id = $5 AND school_id = $6`,
      [
        JSON.stringify(gradedResponses),
        finalScore,
        completedAt,
        timeTakenSeconds,
        attemptId,
        schoolId,
      ]
    );

    // Step 5: Update topic_mastery
    const topicId = attempt.topic_id;
    if (topicId) {
      await updateTopicMastery(
        attempt.student_id,
        topicId,
        schoolId,
        finalScore
      );
    }

    // Step 6: Record learning patterns
    await recordLearningPatterns(
      attempt.student_id,
      schoolId,
      'quiz',
      timeTakenSeconds
    );

    // Step 7: Record mistake patterns
    await recordMistakePatterns(
      attempt.student_id,
      topicId,
      schoolId,
      'quiz',
      gradedResponses
    );

    logger.info(`Test attempt graded: ${attemptId}, Score: ${finalScore}`);

    return {
      id: attemptId,
      studentId: attempt.student_id,
      testId: attempt.test_id,
      schoolId,
      startedAt: attempt.started_at,
      completedAt,
      responses: gradedResponses,
      score: finalScore,
      maxScore: attempt.max_score,
      timeTakenSeconds,
    };
  } catch (error) {
    logger.error('Failed to submit test answers', { error, attemptId });
    throw error;
  }
}

/**
 * Analyze test attempt and generate insights
 */
export async function analyzeTestAttempt(
  attemptId: string,
  schoolId: string
): Promise<{
  strengths: string[];
  weaknesses: string[];
  recommendedTopics: string[];
  nextSteps: string[];
}> {
  try {
    // Step 1: Get attempt with full context
    const attemptResult = await query(
      `SELECT qa.*, q.questions, t.title as topic_title
       FROM quiz_attempts qa
       JOIN quizzes q ON q.id = qa.test_id
       JOIN topics t ON t.id = qa.topic_id
       WHERE qa.id = $1 AND qa.school_id = $2`,
      [attemptId, schoolId]
    );

    if (attemptResult.rows.length === 0) {
      throw new Error('Attempt not found');
    }

    const attempt = attemptResult.rows[0];
    const responses = JSON.parse(attempt.responses);
    const questions = JSON.parse(attempt.questions);

    // Step 2: Analyze responses
    const correctResponses = responses.filter(
      (r: TestResponse) => r.isCorrect
    ).length;
    const incorrectResponses = responses.length - correctResponses;

    // Step 3: Generate insights using LLM
    const analysisPrompt = `
Analyze this test attempt:
- Topic: ${attempt.topic_title}
- Score: ${attempt.score}%
- Correct: ${correctResponses}/${responses.length}
- Time taken: ${attempt.timeTakenSeconds} seconds

Responses:
${responses.map((r: TestResponse, i: number) => `Q${i + 1}: ${r.isCorrect ? '✓' : '✗'} (${r.earnedPoints}/${r.maxPoints})`).join('\n')}

Provide:
1. 2-3 specific strengths shown by this student
2. 2-3 specific areas for improvement
3. 2-3 recommended topics to review
4. 2-3 concrete next steps for learning

Format as JSON: { strengths: [], weaknesses: [], recommendedTopics: [], nextSteps: [] }
    `;

    const analysisResponse = await callLLM({
      model: 'default',
      prompt: analysisPrompt,
      temperature: 0.3,
      maxTokens: 800,
    });

    const analysis = JSON.parse(analysisResponse);

    logger.info(`Test analyzed: ${attemptId}`);

    return analysis;
  } catch (error) {
    logger.error('Failed to analyze test attempt', { error, attemptId });
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function gradeShortAnswer(
  question: string,
  userAnswer: string,
  maxPoints: number
): Promise<{ score: number; comment: string }> {
  const gradingPrompt = `
Grade this answer:
Question: ${question}
Student Answer: ${userAnswer}
Max Points: ${maxPoints}

Respond in JSON format: { "score": <0-${maxPoints}>, "comment": "<brief feedback>" }
  `;

  const response = await callLLM({
    model: 'default',
    prompt: gradingPrompt,
    temperature: 0.3,
    maxTokens: 200,
  });

  return JSON.parse(response);
}

async function updateTopicMastery(
  studentId: string,
  topicId: string,
  schoolId: string,
  score: number
): Promise<void> {
  // Upsert: update if exists, insert if not
  await query(
    `INSERT INTO topic_mastery (
      student_id, topic_id, school_id, mastery_score, attempts, correct_attempts
    ) VALUES ($1, $2, $3, $4, 1, $5)
    ON CONFLICT (student_id, topic_id) DO UPDATE SET
      mastery_score = (mastery_score + $4) / 2,  -- Running average
      attempts = topic_mastery.attempts + 1,
      correct_attempts = topic_mastery.correct_attempts + CASE WHEN $4 >= 80 THEN 1 ELSE 0 END,
      last_attempted_at = NOW()`,
    [studentId, topicId, schoolId, score, score >= 80 ? 1 : 0]
  );
}

async function recordLearningPatterns(
  studentId: string,
  schoolId: string,
  source: 'quiz' | 'diagnostic' | 'session',
  timeTakenSeconds: number
): Promise<void> {
  // Calculate pace score (60s per question is "medium")
  const avgTimePerQuestion = timeTakenSeconds / 5;  // Assuming 5 questions
  const paceScore = Math.max(0, Math.min(100, 60 / avgTimePerQuestion * 100));

  await query(
    `INSERT INTO learning_patterns (
      student_id, school_id, source, pace_score, observed_at
    ) VALUES ($1, $2, $3, $4, NOW())`,
    [studentId, schoolId, source, paceScore]
  );
}

async function recordMistakePatterns(
  studentId: string,
  topicId: string,
  schoolId: string,
  source: 'quiz' | 'diagnostic' | 'session',
  responses: TestResponse[]
): Promise<void> {
  const wrongCount = responses.filter((r) => !r.isCorrect).length;

  // Infer error type from response patterns
  // (In real implementation, this would be more sophisticated)
  const mistakeType =
    wrongCount > responses.length * 0.5 ? 'conceptual' : 'careless';

  await query(
    `INSERT INTO mistake_patterns (
      student_id, topic_id, school_id, source, wrong_count, ${mistakeType}_count, observed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [studentId, topicId, schoolId, source, wrongCount, wrongCount]
  );
}
```

---

## 2. REPOSITORY LAYER TEMPLATE

**File:** `lib/repositories/test-attempt-repository.ts`

```typescript
/**
 * Test Attempt Repository
 * Pure CRUD operations - no business logic
 */

import { query } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('TestAttemptRepository');

export interface TestAttemptRow {
  id: string;
  student_id: string;
  test_id: string;
  school_id: string;
  started_at: string;
  completed_at?: string;
  responses: string; // JSON
  score?: number;
  max_score: number;
  time_taken_seconds?: number;
}

export const testAttemptRepository = {
  // CREATE
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

  // READ
  async getById(id: string, schoolId: string): Promise<TestAttemptRow | null> {
    const result = await query(
      `SELECT * FROM quiz_attempts WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    );

    return result.rows[0] || null;
  },

  // LIST
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
       LIMIT $3 OFFSET $4`,
      [studentId, schoolId, limit, offset]
    );

    return result.rows;
  },

  // UPDATE
  async update(
    id: string,
    schoolId: string,
    data: Partial<TestAttemptRow>
  ): Promise<TestAttemptRow | null> {
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
    if (data.time_taken_seconds !== undefined) {
      updates.push(`time_taken_seconds = $${paramCount++}`);
      values.push(data.time_taken_seconds);
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

  // Helper: Map row to domain object
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
      timeTakenSeconds: row.time_taken_seconds,
    };
  },
};
```

---

## 3. API ROUTE TEMPLATE

**File:** `app/api/tests/[testId]/attempts/route.ts`

```typescript
/**
 * POST /api/tests/[testId]/attempts
 * Start a test attempt
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { createTestAttempt } from '@/lib/services/test-attempt-service';
import { createLogger } from '@/lib/logger';
import type { AuthContext } from '@/lib/types/auth';

const log = createLogger('TestAttemptAPI');

export const POST = withRole(
  ['student'],
  async (
    req: NextRequest,
    auth: AuthContext,
    { params }: { params: { testId: string } }
  ) => {
    try {
      // 1. Validate Auth Context
      if (!auth.schoolId) {
        return NextResponse.json(
          { error: 'Missing tenant context' },
          { status: 401 }
        );
      }

      const { testId } = params;
      const studentId = auth.userId;
      const schoolId = auth.schoolId;

      // 2. Create Attempt
      const attempt = await createTestAttempt(testId, studentId, schoolId);

      // 3. Return
      return NextResponse.json(
        {
          success: true,
          data: attempt,
        },
        { status: 201 }
      );
    } catch (error) {
      log.error('Failed to create test attempt', { error });
      return NextResponse.json(
        { error: 'Failed to create test attempt' },
        { status: 500 }
      );
    }
  }
);
```

**File:** `app/api/tests/attempts/[attemptId]/route.ts`

```typescript
/**
 * PUT /api/tests/attempts/[attemptId]
 * Submit test answers and receive grading
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { submitTestAnswers } from '@/lib/services/test-attempt-service';
import { createLogger } from '@/lib/logger';
import type { AuthContext } from '@/lib/types/auth';

const log = createLogger('TestSubmitAPI');

interface SubmitRequest {
  responses: Array<{
    questionId: string;
    answer: string;
  }>;
}

export const PUT = withRole(
  ['student'],
  async (
    req: NextRequest,
    auth: AuthContext,
    { params }: { params: { attemptId: string } }
  ) => {
    try {
      if (!auth.schoolId) {
        return NextResponse.json(
          { error: 'Missing tenant context' },
          { status: 401 }
        );
      }

      const body = (await req.json()) as SubmitRequest;
      const { attemptId } = params;

      // Submit and grade
      const result = await submitTestAnswers(
        attemptId,
        body.responses,
        auth.schoolId
      );

      return NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 }
      );
    } catch (error) {
      log.error('Failed to submit test', { error });
      return NextResponse.json(
        { error: 'Failed to submit test' },
        { status: 500 }
      );
    }
  }
);
```

---

## 4. TYPE DEFINITIONS TEMPLATE

**File:** `lib/types/tests.ts`

```typescript
/**
 * Test and Assessment Type Definitions
 */

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface Test {
  id: string;
  title: string;
  description?: string;
  topicId: string;
  schoolId: string;
  curriculum
Id?: string;
  questions: Question[];
  maxScore: number;
  estimatedDurationMinutes: number;
  createdBy: string;
  createdAt: Date;
}

export interface TestAttemptResponse {
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
  responses: TestAttemptResponse[];
  score?: number;
  maxScore: number;
  timeTakenSeconds?: number;
}

export interface TestAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendedTopics: string[];
  nextSteps: string[];
  masteredConcepts: string[];
  needsRedoTopics: string[];
}
```

---

## Key Checklist When Implementing

- [ ] All queries include `school_id` filtering for tenant isolation
- [ ] All API routes use `withRole()` middleware
- [ ] Services use `createLogger()` for structured logging
- [ ] Error handling with `.catch()` fallbacks for analytics
- [ ] Database mapping functions convert rows to domain objects
- [ ] Responses follow `{ success, data/error }` pattern
- [ ] Tests in `/quiz_attempts` table with responses as JSONB
- [ ] Topic mastery updated after each attempt
- [ ] Learning patterns recorded for analytics
- [ ] Mistake patterns recorded for diagnostics
- [ ] LLM used for short-answer grading
- [ ] Comments explain each business logic step
