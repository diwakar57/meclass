/**
 * TEST ATTEMPT ANALYSIS SERVICE
 * 
 * Core intelligence layer for analyzing student test attempts and comparing
 * confidence vs actual performance. All calculations are deterministic and traceable.
 */

import { createLogger } from '@/lib/logger'
import { query } from '@/lib/db'
import {
  TestAttempt,
  StudentAnswer,
  ConfidenceAnalysis,
  ConfidenceMismatchType,
  ReadinessLevel,
  PerformanceStatus,
  TopicPerformance,
  ConfidenceMetrics,
  PerformanceMetrics,
  MismatchCalculation,
  ReadinessCalculation,
  ConfidenceLevel,
  ConfidenceDataPoint,
  TestAttemptRow,
} from '@/lib/types/test-attempts'

const logger = createLogger('TestAttemptAnalysisService')

// ============================================================================
// METRIC CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate confidence metrics from student answers
 * 
 * TRANSPARENT CALCULATION:
 * - Filters answers with confidence scores
 * - Normalizes confidence scale (1-5) to percentage (0-100)
 * - Calculates mean, std dev, counts
 */
function calculateConfidenceMetrics(answers: StudentAnswer[]): ConfidenceMetrics {
  const answersWithConfidence = answers.filter((a) => a.confidenceScore !== undefined)
  const confidenceValues = answersWithConfidence.map((a) => (a.confidenceScore || 3) * 20) // Convert 1-5 to 0-100

  if (confidenceValues.length === 0) {
    return {
      averageConfidence: 0,
      minConfidence: 0,
      maxConfidence: 0,
      confidenceStdDev: 0,
      questionsWithConfidence: 0,
      questionsWithoutConfidence: answers.length,
    }
  }

  const avg = confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length
  const variance = confidenceValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / confidenceValues.length
  const stdDev = Math.sqrt(variance)

  return {
    averageConfidence: Math.round(avg),
    minConfidence: Math.min(...confidenceValues),
    maxConfidence: Math.max(...confidenceValues),
    confidenceStdDev: Math.round(stdDev),
    questionsWithConfidence: answersWithConfidence.length,
    questionsWithoutConfidence: answers.length - answersWithConfidence.length,
  }
}

/**
 * Calculate performance metrics from test attempt
 * 
 * TRANSPARENT CALCULATION:
 * - Percentage = (correct / total) * 100
 * - Handles edge case of 0 questions
 */
function calculatePerformanceMetrics(attempt: TestAttempt): PerformanceMetrics {
  return {
    percentageCorrect: attempt.totalQuestionsAnswered > 0 
      ? Math.round((attempt.totalQuestionsCorrect / attempt.totalQuestionsAnswered) * 100)
      : 0,
    totalPoints: attempt.totalPoints,
    pointsEarned: attempt.pointsEarned,
    questionsCorrect: attempt.totalQuestionsCorrect,
    totalQuestions: attempt.totalQuestionsAnswered,
  }
}

/**
 * Normalize values to 0-100 scale for comparison
 * Converts different measurement scales to common scale
 * 
 * EXAMPLES:
 * - Confidence: 1-5 scale → multiply by 20 → 0-100
 * - Performance: 70% → stays 70
 */
function normalizeToScale(value: number, fromMin: number, fromMax: number): number {
  const range = fromMax - fromMin
  if (range === 0) return 0
  const normalized = ((value - fromMin) / range) * 100
  return Math.max(0, Math.min(100, normalized))
}

/**
 * Calculate mismatch between confidence and performance
 * 
 * ALGORITHM:
 * 1. Normalize both to 0-100 scale
 * 2. Calculate absolute difference
 * 3. Classify based on direction and magnitude
 * 
 * MISMATCH TYPES:
 * - well_calibrated: difference ≤ 10%
 * - overconfident: confidence > performance, difference > 10%
 * - underconfident: confidence < performance, difference > 10%
 * - inconsistent: varies by topic (calculated at topic level)
 */
function calculateMismatch(
  confidence: number,
  performance: number,
): MismatchCalculation {
  const absGap = Math.abs(confidence - performance)

  let type: ConfidenceMismatchType
  let severity: 'low' | 'moderate' | 'high'
  let explanation: string

  if (absGap <= 10) {
    type = ConfidenceMismatchType.WELL_CALIBRATED
    explanation = 'Student\'s confidence aligns well with actual performance'
    severity = 'low'
  } else if (confidence > performance) {
    type = ConfidenceMismatchType.OVERCONFIDENT
    if (absGap <= 20) {
      severity = 'low'
      explanation = `Student is moderately overconfident (${Math.round(absGap)}% gap)`
    } else if (absGap <= 40) {
      severity = 'moderate'
      explanation = `Student is significantly overconfident (${Math.round(absGap)}% gap)`
    } else {
      severity = 'high'
      explanation = `Student is severely overconfident (${Math.round(absGap)}% gap)`
    }
  } else {
    type = ConfidenceMismatchType.UNDERCONFIDENT
    if (absGap <= 20) {
      severity = 'low'
      explanation = `Student is moderately underconfident (${Math.round(absGap)}% gap)`
    } else if (absGap <= 40) {
      severity = 'moderate'
      explanation = `Student is significantly underconfident (${Math.round(absGap)}% gap)`
    } else {
      severity = 'high'
      explanation = `Student is severely underconfident (${Math.round(absGap)}% gap)`
    }
  }

  return {
    mismatchScore: Math.round(absGap),
    mismatchType: type,
    severity,
    explanation,
  }
}

/**
 * Classify readiness level based on confidence and performance
 * 
 * ALGORITHM:
 * 1. Evaluate performance status (excellent, good, satisfactory, needs improvement)
 * 2. Evaluate confidence (high: ≥60, low: <60)
 * 3. Combine for readiness classification
 * 
 * READINESS MATRIX:
 * High Performance + High Confidence = READY
 * High Performance + Low Confidence = UNDERCONFIDENT
 * Low Performance + High Confidence = OVERCONFIDENT  
 * Low Performance + Low Confidence = SUPPORT_REQUIRED
 */
function classifyReadiness(
  confidence: number,
  performance: number,
): ReadinessCalculation {
  const highConfidence = confidence >= 60
  const highPerformance = performance >= 75 // Threshold for "good" performance

  let level: ReadinessLevel
  let reason: string
  let actionItems: string[]

  if (highPerformance && highConfidence) {
    level = ReadinessLevel.READY
    reason = 'Student demonstrates strong performance with appropriate confidence'
    actionItems = [
      'Ready to advance to next topic',
      'Monitor for signs of overconfidence',
      'Provide enrichment opportunities',
    ]
  } else if (highPerformance && !highConfidence) {
    level = ReadinessLevel.UNDERCONFIDENT
    reason = 'Student performs well but lacks appropriate confidence'
    actionItems = [
      'Provide encouragement and recognition of strengths',
      'Assign challenging problems to build confidence',
      'Share positive feedback from assessment',
      'Ready to advance with support for confidence building',
    ]
  } else if (!highPerformance && highConfidence) {
    level = ReadinessLevel.OVERCONFIDENT
    reason = 'Student is confident but performance does not match confidence'
    actionItems = [
      'Review and address conceptual gaps',
      'Provide targeted practice on weak areas',
      'Use formative assessment to build accurate self-assessment',
      'Delay advancement until performance improves',
    ]
  } else {
    level = ReadinessLevel.SUPPORT_REQUIRED
    reason = 'Student demonstrates low performance and lacks confidence'
    actionItems = [
      'Provide intensive intervention and support',
      'Break content into smaller chunks',
      'Use scaffolding and guided practice',
      'Build foundational skills before advancing',
      'Increase frequency of formative assessments',
    ]
  }

  return {
    level,
    confidence,
    performance,
    reason,
    actionItems,
  }
}

/**
 * Group answers by topic and calculate topic-level analysis
 */
function analyzeByTopic(answers: StudentAnswer[]): ConfidenceDataPoint[] {
  const byTopic = new Map<string, {
    topicId: string
    topicName: string
    answers: StudentAnswer[]
  }>()

  // Group answers by topic
  answers.forEach((answer) => {
    const key = answer.topicId
    if (!byTopic.has(key)) {
      byTopic.set(key, {
        topicId: answer.topicId,
        topicName: answer.topicId, // Will be enriched later
        answers: [],
      })
    }
    byTopic.get(key)!.answers.push(answer)
  })

  // Calculate metrics for each topic
  return Array.from(byTopic.values()).map((topic) => {
    const topicAnswers = topic.answers
    const correct = topicAnswers.filter((a) => a.isCorrect).length
    const confidence = calculateConfidenceMetrics(topicAnswers)
    const performance = Math.round((correct / topicAnswers.length) * 100)

    const mismatch = calculateMismatch(confidence.averageConfidence, performance)

    return {
      topicId: topic.topicId,
      topicName: topic.topicName,
      studentConfidence: confidence.averageConfidence,
      actualPerformance: performance,
      mismatchScore: mismatch.mismatchScore,
      questionsCount: topicAnswers.length,
      isUnderprepared: performance < 70 && confidence.averageConfidence >= 60, // Has issues but confident
      isAreas: performance < 70, // Any weak performance
    }
  })
}

// ============================================================================
// PUBLIC SERVICE METHODS
// ============================================================================

/**
 * Analyze a complete test attempt for confidence vs performance
 * 
 * FLOW:
 * 1. Load test attempt with all answers
 * 2. Calculate confidence metrics from student-provided scores
 * 3. Calculate performance metrics from grading
 * 4. Identify mismatch between confidence and performance
 * 5. Classify overall readiness level
 * 6. Analyze by topic for granular insights
 * 7. Generate strong/weak topic lists
 * 8. Create actionable recommendations
 * 
 * All calculations are transparent and traceable for educational value
 */
export async function analyzeTestAttempt(
  testAttemptId: string,
  schoolId: string,
): Promise<ConfidenceAnalysis> {
  try {
    // Load test attempt (must be graded first)
    const attemptResult = await query<TestAttemptRow>(
      `SELECT * FROM test_attempts 
       WHERE id = $1 AND school_id = $2 AND status IN ('graded', 'reviewed')`,
      [testAttemptId, schoolId],
    )

    if (attemptResult.rows.length === 0) {
      throw new Error(`Test attempt ${testAttemptId} not found or not graded`)
    }

    const attemptRow = attemptResult.rows[0]
    const answers: StudentAnswer[] = JSON.parse(attemptRow.answers_json || '[]')

    // Reconstruct TestAttempt object
    const attempt: TestAttempt = {
      id: attemptRow.id,
      studentId: attemptRow.student_id,
      schoolId: attemptRow.school_id,
      testId: attemptRow.test_id,
      testName: attemptRow.test_name,
      testType: attemptRow.test_type,
      status: attemptRow.status,
      startedAt: attemptRow.started_at,
      submittedAt: attemptRow.submitted_at,
      completedAt: attemptRow.completed_at,
      timeAllowedMinutes: attemptRow.time_allowed_minutes,
      totalPoints: attemptRow.total_points,
      pointsEarned: attemptRow.points_earned,
      percentageScore: attemptRow.percentage_score,
      performanceStatus: attemptRow.performance_status,
      answers,
      totalQuestionsAnswered: attemptRow.total_questions_answered,
      totalQuestionsCorrect: attemptRow.total_questions_correct,
      createdAt: attemptRow.created_at,
      updatedAt: attemptRow.updated_at,
    }

    // Calculate metrics
    const confidenceMetrics = calculateConfidenceMetrics(answers)
    const performanceMetrics = calculatePerformanceMetrics(attempt)

    logger.info('Confidence metrics calculated', {
      avgConfidence: confidenceMetrics.averageConfidence,
      withConfidenceData: confidenceMetrics.questionsWithConfidence,
    })

    logger.info('Performance metrics calculated', {
      percentageCorrect: performanceMetrics.percentageCorrect,
      questionsCorrect: performanceMetrics.questionsCorrect,
    })

    // Calculate overall mismatch
    const mismatch = calculateMismatch(
      confidenceMetrics.averageConfidence,
      performanceMetrics.percentageCorrect,
    )

    logger.info('Mismatch calculated', {
      mismatchScore: mismatch.mismatchScore,
      type: mismatch.mismatchType,
      severity: mismatch.severity,
    })

    // Classify readiness
    const readiness = classifyReadiness(
      confidenceMetrics.averageConfidence,
      performanceMetrics.percentageCorrect,
    )

    logger.info('Readiness classified', {
      level: readiness.level,
      confidence: readiness.confidence,
      performance: readiness.performance,
    })

    // Topic-level analysis
    const topicAnalysis = analyzeByTopic(answers)

    // Identify strong and weak topics
    const strongTopics = topicAnalysis
      .filter((t) => t.actualPerformance >= 80)
      .sort((a, b) => b.actualPerformance - a.actualPerformance)
      .slice(0, 5)
      .map((t) => ({
        topicId: t.topicId,
        topicName: t.topicName,
        confidence: t.studentConfidence,
        performance: t.actualPerformance,
        wellCalibrated: t.mismatchScore <= 10,
      }))

    const weakTopics = topicAnalysis
      .filter((t) => t.actualPerformance < 75)
      .sort((a, b) => a.actualPerformance - b.actualPerformance)
      .slice(0, 5)
      .map((t) => {
        const reason: 'overconfident' | 'underconfident' | 'poorly_prepared' =
          t.studentConfidence >= 60 && t.actualPerformance < 60
            ? 'overconfident'
            : t.studentConfidence < 40 && t.actualPerformance >= 75
              ? 'underconfident'
              : 'poorly_prepared'

        return {
          topicId: t.topicId,
          topicName: t.topicName,
          confidence: t.studentConfidence,
          performance: t.actualPerformance,
          reason,
        }
      })

    // Create analysis result
    const analysis: ConfidenceAnalysis = {
      testAttemptId,
      studentId: attempt.studentId,
      schoolId,
      overallConfidence: confidenceMetrics.averageConfidence,
      overallPerformance: performanceMetrics.percentageCorrect,
      overallMismatchScore: mismatch.mismatchScore,
      readinessLevel: readiness.level,
      confidenceMismatchType: mismatch.mismatchType,
      topicAnalysis,
      strongTopics,
      weakTopics,
      readinessAssessment: {
        level: readiness.level,
        explanation: readiness.reason,
        reasonKey: deriveReasonKey(readiness.level, confidenceMetrics, performanceMetrics),
        recommendedActions: readiness.actionItems,
      },
      mismatchAnalysis: {
        type: mismatch.mismatchType,
        severity: mismatch.severity,
        explanation: mismatch.explanation,
        affectedTopics: topicAnalysis
          .filter((t) => t.mismatchScore > 15)
          .map((t) => t.topicName),
      },
      analyzedAt: new Date(),
      createdAt: new Date(),
    }

    logger.info('Test attempt analysis complete', {
      readinessLevel: analysis.readinessLevel,
      mismatchType: analysis.confidenceMismatchType,
      strongTopics: analysis.strongTopics.length,
      weakTopics: analysis.weakTopics.length,
    })

    return analysis
  } catch (error) {
    logger.error('Error analyzing test attempt', {
      testAttemptId,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Save analysis to database
 */
export async function saveAnalysis(
  analysis: ConfidenceAnalysis,
  schoolId: string,
): Promise<void> {
  try {
    await query(
      `INSERT INTO test_attempt_analyses 
       (test_attempt_id, student_id, school_id, overall_confidence, overall_performance,
        overall_mismatch_score, readiness_level, confidence_mismatch_type, 
        topic_analysis_json, strong_topics_json, weak_topics_json,
        readiness_assessment_json, mismatch_analysis_json, analyzed_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        analysis.testAttemptId,
        analysis.studentId,
        schoolId,
        analysis.overallConfidence,
        analysis.overallPerformance,
        analysis.overallMismatchScore,
        analysis.readinessLevel,
        analysis.confidenceMismatchType,
        JSON.stringify(analysis.topicAnalysis),
        JSON.stringify(analysis.strongTopics),
        JSON.stringify(analysis.weakTopics),
        JSON.stringify(analysis.readinessAssessment),
        JSON.stringify(analysis.mismatchAnalysis),
        analysis.analyzedAt,
        analysis.createdAt,
      ],
    )

    logger.info('Analysis saved to database', {
      testAttemptId: analysis.testAttemptId,
      studentId: analysis.studentId,
    })
  } catch (error) {
    logger.error('Error saving analysis', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Get latest analysis for a student
 */
export async function getLatestAnalysis(
  studentId: string,
  schoolId: string,
): Promise<ConfidenceAnalysis | null> {
  try {
    const result = await query<any>(
      `SELECT * FROM test_attempt_analyses 
       WHERE student_id = $1 AND school_id = $2
       ORDER BY analyzed_at DESC LIMIT 1`,
      [studentId, schoolId],
    )

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      testAttemptId: row.test_attempt_id,
      studentId: row.student_id,
      schoolId: row.school_id,
      overallConfidence: row.overall_confidence,
      overallPerformance: row.overall_performance,
      overallMismatchScore: row.overall_mismatch_score,
      readinessLevel: row.readiness_level,
      confidenceMismatchType: row.confidence_mismatch_type,
      topicAnalysis: JSON.parse(row.topic_analysis_json),
      strongTopics: JSON.parse(row.strong_topics_json),
      weakTopics: JSON.parse(row.weak_topics_json),
      readinessAssessment: JSON.parse(row.readiness_assessment_json),
      mismatchAnalysis: JSON.parse(row.mismatch_analysis_json),
      analyzedAt: row.analyzed_at,
      createdAt: row.created_at,
    }
  } catch (error) {
    logger.error('Error fetching analysis', {
      studentId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Derive human-readable reason key from readiness level and metrics
 * Used for dashboard and reporting
 */
function deriveReasonKey(
  level: ReadinessLevel,
  confidence: ConfidenceMetrics,
  performance: PerformanceMetrics,
): string {
  if (confidence.questionsWithConfidence === 0) {
    return 'no_confidence_data'
  }

  const confidenceScore = confidence.averageConfidence
  const performanceScore = performance.percentageCorrect

  const highConfidence = confidenceScore >= 60
  const highPerformance = performanceScore >= 75

  if (highPerformance && highConfidence) return 'ready'
  if (highPerformance && !highConfidence) return 'underconfident_perform_well'
  if (!highPerformance && highConfidence) return 'overconfident_perform_poor'
  return 'underconfident_perform_poor'
}

/**
 * Calculate trend across multiple analyses (improving/declining/stable)
 */
export function calculateTrend(
  current: ConfidenceAnalysis,
  previous: ConfidenceAnalysis | null,
): 'improving' | 'declining' | 'stable' {
  if (!previous) return 'stable'

  const performanceDiff = current.overallPerformance - previous.overallPerformance
  const mismatchDiff = previous.overallMismatchScore - current.overallMismatchScore // Better if positive

  if (performanceDiff > 5 || mismatchDiff > 5) return 'improving'
  if (performanceDiff < -5 || mismatchDiff < -5) return 'declining'
  return 'stable'
}
