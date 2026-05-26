/**
 * TEST ATTEMPT REPOSITORY
 * 
 * Data access layer for test attempts, answers, and analysis results.
 * Handles all database operations with proper tenant isolation.
 */

import { query } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import {
  TestAttempt,
  TestAttemptRow,
  StudentAnswer,
  PerformanceStatus,
  TopicPerformance,
  TestAttemptListResponse,
} from '@/lib/types/test-attempts'

const logger = createLogger('TestAttemptRepository')

// ============================================================================
// ROW MAPPERS
// ============================================================================

function parseAnswersJson(rawAnswers: unknown): StudentAnswer[] {
  if (!rawAnswers) {
    return []
  }

  if (Array.isArray(rawAnswers)) {
    return rawAnswers as StudentAnswer[]
  }

  if (typeof rawAnswers === 'string') {
    try {
      const parsed = JSON.parse(rawAnswers)
      return Array.isArray(parsed) ? (parsed as StudentAnswer[]) : []
    } catch (error) {
      logger.warn('Failed to parse answers_json as string', {
        error: error instanceof Error ? error.message : String(error),
      })
      return []
    }
  }

  logger.warn('Unexpected answers_json type while mapping test attempt', {
    valueType: typeof rawAnswers,
  })
  return []
}

function mapRowToTestAttempt(row: TestAttemptRow): TestAttempt {
  const answers = parseAnswersJson(row.answers_json as unknown)

  return {
    id: row.id,
    quizAttemptId: row.quiz_attempt_id,
    studentId: row.student_id,
    schoolId: row.school_id,
    testId: row.test_id,
    testName: row.test_name,
    testType: row.test_type,
    status: row.status,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    completedAt: row.completed_at,
    timeAllowedMinutes: row.time_allowed_minutes ? Number(row.time_allowed_minutes) : undefined,
    totalPoints: Number(row.total_points || 0),
    pointsEarned: Number(row.points_earned || 0),
    percentageScore: Number(row.percentage_score || 0),
    performanceStatus: row.performance_status,
    answers,
    totalQuestionsAnswered: Number(row.total_questions_answered || 0),
    totalQuestionsCorrect: Number(row.total_questions_correct || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================================================
// TEST ATTEMPT REPOSITORY
// ============================================================================

export const testAttemptRepository = {
  /**
   * Create a new test attempt
   */
  async create(
    studentId: string,
    schoolId: string,
    testId: string,
    testName: string,
    testType: 'diagnostic' | 'formative' | 'summative' | 'practice',
    timeAllowedMinutes?: number,
    quizAttemptId?: string,
  ): Promise<TestAttempt> {
    const id = `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const result = await query<TestAttemptRow>(
      `INSERT INTO test_attempts 
       (id, quiz_attempt_id, student_id, school_id, test_id, test_name, test_type, 
        status, started_at, total_points, points_earned, percentage_score, 
        performance_status, total_questions_answered, total_questions_correct, 
        answers_json, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        id,
        quizAttemptId || null,
        studentId,
        schoolId,
        testId,
        testName,
        testType,
        'in_progress',
        new Date(),
        0, // totalPoints
        0, // pointsEarned
        0, // percentageScore
        'not_yet_attempted',
        0, // totalQuestionsAnswered
        0, // totalQuestionsCorrect
        JSON.stringify([]), // answers_json
        new Date(),
        new Date(),
      ],
    )

    if (result.rows.length === 0) {
      throw new Error('Failed to create test attempt')
    }

    logger.info('Test attempt created', { id, studentId, testId })
    return mapRowToTestAttempt(result.rows[0])
  },

  /**
   * Get test attempt by ID
   */
  async getById(testAttemptId: string, schoolId: string): Promise<TestAttempt | null> {
    const result = await query<TestAttemptRow>(
      `SELECT * FROM test_attempts WHERE id = $1 AND school_id = $2`,
      [testAttemptId, schoolId],
    )

    if (result.rows.length === 0) return null
    return mapRowToTestAttempt(result.rows[0])
  },

  /**
   * List test attempts for a student
   */
  async listByStudent(
    studentId: string,
    schoolId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ attempts: TestAttempt[]; total: number }> {
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM test_attempts 
       WHERE student_id = $1 AND school_id = $2`,
      [studentId, schoolId],
    )

    const total = parseInt(countResult.rows[0]?.count || '0', 10)

    const result = await query<TestAttemptRow>(
      `SELECT * FROM test_attempts 
       WHERE student_id = $1 AND school_id = $2
       ORDER BY started_at DESC
       LIMIT $3 OFFSET $4`,
      [studentId, schoolId, limit, offset],
    )

    return {
      attempts: result.rows.map(mapRowToTestAttempt),
      total,
    }
  },

  /**
   * List test attempts for a test
   */
  async listByTest(
    testId: string,
    schoolId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ attempts: TestAttempt[]; total: number }> {
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM test_attempts 
       WHERE test_id = $1 AND school_id = $2`,
      [testId, schoolId],
    )

    const total = parseInt(countResult.rows[0]?.count || '0', 10)

    const result = await query<TestAttemptRow>(
      `SELECT * FROM test_attempts 
       WHERE test_id = $1 AND school_id = $2
       ORDER BY started_at DESC
       LIMIT $3 OFFSET $4`,
      [testId, schoolId, limit, offset],
    )

    return {
      attempts: result.rows.map(mapRowToTestAttempt),
      total,
    }
  },

  /**
   * Update test attempt (submit answers, update status)
   */
  async update(testAttemptId: string, schoolId: string, updates: Partial<TestAttempt>): Promise<TestAttempt> {
    const current = await testAttemptRepository.getById(testAttemptId, schoolId)
    if (!current) {
      throw new Error(`Test attempt ${testAttemptId} not found`)
    }

    // Merge updates
    const merged: TestAttempt = { ...current, ...updates }

    // Recalculate performance status
    const performanceStatus = derivePerformanceStatus(merged.percentageScore)

    const result = await query<TestAttemptRow>(
      `UPDATE test_attempts 
       SET status = $1, submitted_at = COALESCE($2, submitted_at), 
           completed_at = COALESCE($3, completed_at),
           total_points = $4, points_earned = $5, percentage_score = $6,
           performance_status = $7, total_questions_answered = $8,
           total_questions_correct = $9, answers_json = $10,
           updated_at = $11
       WHERE id = $12 AND school_id = $13
       RETURNING *`,
      [
        updates.status || current.status,
        updates.submittedAt || current.submittedAt,
        updates.completedAt || current.completedAt,
        updates.totalPoints ?? current.totalPoints,
        updates.pointsEarned ?? current.pointsEarned,
        updates.percentageScore ?? current.percentageScore,
        performanceStatus,
        updates.totalQuestionsAnswered ?? current.totalQuestionsAnswered,
        updates.totalQuestionsCorrect ?? current.totalQuestionsCorrect,
        updates.answers ? JSON.stringify(updates.answers) : JSON.stringify(current.answers),
        new Date(),
        testAttemptId,
        schoolId,
      ],
    )

    if (result.rows.length === 0) {
      throw new Error('Failed to update test attempt')
    }

    logger.info('Test attempt updated', { id: testAttemptId, status: updates.status })
    return mapRowToTestAttempt(result.rows[0])
  },

  /**
   * Delete test attempt (only if in_progress)
   */
  async delete(testAttemptId: string, schoolId: string): Promise<void> {
    const attempt = await testAttemptRepository.getById(testAttemptId, schoolId)
    if (!attempt) {
      throw new Error(`Test attempt ${testAttemptId} not found`)
    }

    if (attempt.status !== 'in_progress') {
      throw new Error('Can only delete in-progress test attempts')
    }

    await query(`DELETE FROM test_attempts WHERE id = $1 AND school_id = $2`, [testAttemptId, schoolId])

    logger.info('Test attempt deleted', { id: testAttemptId })
  },

  /**
   * Get test attempts for a class/cohort
   */
  async listByClass(
    classId: string,
    schoolId: string,
    testType?: string,
  ): Promise<TestAttempt[]> {
    let sql = `SELECT ta.* FROM test_attempts ta
               JOIN users u ON ta.student_id = u.id
               WHERE u.class_id = $1 AND ta.school_id = $2`
    const params: any[] = [classId, schoolId]

    if (testType) {
      sql += ` AND ta.test_type = $3`
      params.push(testType)
    }

    sql += ` ORDER BY ta.started_at DESC`

    const result = await query<TestAttemptRow>(sql, params)
    return result.rows.map(mapRowToTestAttempt)
  },
}

// ============================================================================
// TOPIC PERFORMANCE REPOSITORY
// ============================================================================

export const topicPerformanceRepository = {
  /**
   * Calculate and save topic performance from test attempt
   */
  async calculateAndSave(
    testAttemptId: string,
    schoolId: string,
    answers: StudentAnswer[],
  ): Promise<TopicPerformance[]> {
    const byTopic = new Map<string, StudentAnswer[]>()

    // Group answers by topic
    answers.forEach((answer) => {
      if (!byTopic.has(answer.topicId)) {
        byTopic.set(answer.topicId, [])
      }
      byTopic.get(answer.topicId)!.push(answer)
    })

    const topicPerformances: TopicPerformance[] = []

    // Calculate metrics per topic
    for (const [topicId, topicAnswers] of byTopic.entries()) {
      const correct = topicAnswers.filter((a) => a.isCorrect).length
      const percentageCorrect = Math.round((correct / topicAnswers.length) * 100)

      const performanceStatus = derivePerformanceStatus(percentageCorrect)
      const avgConfidence = calculateAverageConfidence(topicAnswers)
      const totalTimeSeconds = topicAnswers.reduce((sum, a) => sum + (a.secondsSpent || 0), 0)

      const mismatch = Math.abs(avgConfidence - percentageCorrect)
      const mismatchType =
        mismatch <= 10
          ? 'well_calibrated'
          : avgConfidence > percentageCorrect
            ? 'overconfident'
            : 'underconfident'

      const perf: TopicPerformance = {
        topicId,
        topicName: topicId, // Will be enriched from topic table
        totalQuestions: topicAnswers.length,
        correctAnswers: correct,
        percentageCorrect,
        performanceStatus,
        averageConfidence: avgConfidence,
        timeSpentSeconds: totalTimeSeconds,
        confidenceVsPerformance: {
          averageStudentConfidence: avgConfidence,
          actualPercentageScore: percentageCorrect,
          mismatchScore: mismatch,
          mismatchType: mismatchType as any,
        },
      }

      topicPerformances.push(perf)

      // Save to database
      await query(
        `INSERT INTO topic_performance_by_attempt 
         (test_attempt_id, school_id, topic_id, total_questions, correct_answers,
          percentage_correct, performance_status, average_confidence, time_spent_seconds,
          average_student_confidence, actual_percentage_score, mismatch_score, 
          mismatch_type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          testAttemptId,
          schoolId,
          topicId,
          topicAnswers.length,
          correct,
          percentageCorrect,
          performanceStatus,
          avgConfidence,
          totalTimeSeconds,
          avgConfidence,
          percentageCorrect,
          mismatch,
          mismatchType,
          new Date(),
        ],
      )
    }

    logger.info('Topic performance saved', {
      testAttemptId,
      topicCount: topicPerformances.length,
    })

    return topicPerformances
  },

  /**
   * Get topic performance for a test attempt
   */
  async getByAttempt(testAttemptId: string, schoolId: string): Promise<TopicPerformance[]> {
    const result = await query<any>(
      `SELECT * FROM topic_performance_by_attempt 
       WHERE test_attempt_id = $1 AND school_id = $2
       ORDER BY topic_id ASC`,
      [testAttemptId, schoolId],
    )

    return result.rows.map((row) => ({
      topicId: row.topic_id,
      topicName: row.topic_id,
      totalQuestions: row.total_questions,
      correctAnswers: row.correct_answers,
      percentageCorrect: row.percentage_correct,
      performanceStatus: row.performance_status,
      averageConfidence: row.average_confidence,
      timeSpentSeconds: row.time_spent_seconds,
      confidenceVsPerformance: {
        averageStudentConfidence: row.average_student_confidence,
        actualPercentageScore: row.actual_percentage_score,
        mismatchScore: row.mismatch_score,
        mismatchType: row.mismatch_type,
      },
    }))
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Derive performance status from percentage score
 */
function derivePerformanceStatus(percentageScore: number): PerformanceStatus {
  if (percentageScore === 0) return PerformanceStatus.NOT_YET_ATTEMPTED
  if (percentageScore >= 90) return PerformanceStatus.EXCELLENT
  if (percentageScore >= 80) return PerformanceStatus.GOOD
  if (percentageScore >= 70) return PerformanceStatus.SATISFACTORY
  return PerformanceStatus.NEEDS_IMPROVEMENT
}

/**
 * Calculate average confidence from answers
 */
function calculateAverageConfidence(answers: StudentAnswer[]): number {
  const answersWithConfidence = answers.filter((a) => a.confidenceScore !== undefined)
  if (answersWithConfidence.length === 0) return 0

  const sum = answersWithConfidence.reduce((total, a) => total + ((a.confidenceScore || 3) * 20), 0)
  return Math.round(sum / answersWithConfidence.length)
}
