/**
 * TEST ATTEMPT VALIDATION SERVICE
 * 
 * Comprehensive validation for test attempts, answers, and analysis
 * Ensures data quality and prevents invalid states
 */

import { createLogger } from '@/lib/logger'
import {
  TestAttempt,
  StudentAnswer,
  SubmitTestResponseRequest,
  ValidationError,
  TestAttemptValidationResult,
  ConfidenceLevel,
} from '@/lib/types/test-attempts'

const logger = createLogger('TestAttemptValidationService')

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES = {
  // Test attempt constraints
  MIN_ANSWERS: 1,
  MAX_ANSWERS: 200,
  
  // Answer constraints
  CONFIDENCE_MIN: ConfidenceLevel.VERY_UNCERTAIN,
  CONFIDENCE_MAX: ConfidenceLevel.VERY_CONFIDENT,
  
  // Time constraints (seconds)
  MIN_SECONDS_PER_ANSWER: 5,
  MAX_SECONDS_PER_ANSWER: 3600, // 1 hour per question
  
  // Score constraints
  MIN_POINTS: 0,
  MAX_POINTS: 100000,
  
  // Text length constraints
  MAX_ANSWER_LENGTH: 10000,
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate test attempt structure
 */
export function validateTestAttempt(attempt: TestAttempt): TestAttemptValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Check required fields
  if (!attempt.id || attempt.id.trim() === '') {
    errors.push({
      field: 'id',
      message: 'Test attempt ID is required',
      code: 'MISSING_ID',
    })
  }

  if (!attempt.studentId || attempt.studentId.trim() === '') {
    errors.push({
      field: 'studentId',
      message: 'Student ID is required',
      code: 'MISSING_STUDENT_ID',
    })
  }

  if (!attempt.testId || attempt.testId.trim() === '') {
    errors.push({
      field: 'testId',
      message: 'Test ID is required',
      code: 'MISSING_TEST_ID',
    })
  }

  // Check answer count
  if (attempt.answers.length < VALIDATION_RULES.MIN_ANSWERS) {
    warnings.push('Test has no answers yet')
  }

  if (attempt.answers.length > VALIDATION_RULES.MAX_ANSWERS) {
    errors.push({
      field: 'answers',
      message: `Test cannot have more than ${VALIDATION_RULES.MAX_ANSWERS} answers`,
      code: 'TOO_MANY_ANSWERS',
    })
  }

  // Check status transitions
  if (attempt.status === 'submitted' && !attempt.submittedAt) {
    errors.push({
      field: 'submittedAt',
      message: 'Submitted test must have submission timestamp',
      code: 'MISSING_SUBMISSION_TIME',
    })
  }

  if (attempt.status === 'graded' && attempt.answers.some((a) => a.gradedAt === undefined)) {
    warnings.push('Some answers are not yet graded')
  }

  // Check score validity
  if (attempt.percentageScore < 0 || attempt.percentageScore > 100) {
    errors.push({
      field: 'percentageScore',
      message: 'Score percentage must be between 0 and 100',
      code: 'INVALID_PERCENTAGE',
    })
  }

  if (attempt.pointsEarned < VALIDATION_RULES.MIN_POINTS || 
      attempt.pointsEarned > VALIDATION_RULES.MAX_POINTS) {
    errors.push({
      field: 'pointsEarned',
      message: `Points earned must be between ${VALIDATION_RULES.MIN_POINTS} and ${VALIDATION_RULES.MAX_POINTS}`,
      code: 'INVALID_POINTS',
    })
  }

  // Check answer-score consistency
  if (attempt.status === 'submitted' || attempt.status === 'graded') {
    if (attempt.answers.length !== attempt.totalQuestionsAnswered) {
      errors.push({
        field: 'totalQuestionsAnswered',
        message: 'Answer count does not match total questions answered',
        code: 'ANSWER_COUNT_MISMATCH',
      })
    }

    const correctCount = attempt.answers.filter((a) => a.isCorrect).length
    if (correctCount !== attempt.totalQuestionsCorrect) {
      warnings.push('Correct answer count mismatch - will recalculate')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate student answer
 */
export function validateStudentAnswer(answer: StudentAnswer): TestAttemptValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Check required fields
  if (!answer.questionId || answer.questionId.trim() === '') {
    errors.push({
      field: 'questionId',
      message: 'Question ID is required',
      code: 'MISSING_QUESTION_ID',
    })
  }

  if (!answer.topicId || answer.topicId.trim() === '') {
    errors.push({
      field: 'topicId',
      message: 'Topic ID is required',
      code: 'MISSING_TOPIC_ID',
    })
  }

  if (answer.selectedAnswer === undefined || answer.selectedAnswer === null) {
    errors.push({
      field: 'selectedAnswer',
      message: 'Selected answer is required',
      code: 'MISSING_ANSWER',
    })
  }

  // Validate answer format
  if (typeof answer.selectedAnswer === 'string') {
    if (answer.selectedAnswer.length > VALIDATION_RULES.MAX_ANSWER_LENGTH) {
      errors.push({
        field: 'selectedAnswer',
        message: `Answer text exceeds maximum length of ${VALIDATION_RULES.MAX_ANSWER_LENGTH}`,
        code: 'ANSWER_TOO_LONG',
      })
    }
  }

  // Validate confidence score
  if (answer.confidenceScore !== undefined) {
    if (
      answer.confidenceScore < VALIDATION_RULES.CONFIDENCE_MIN ||
      answer.confidenceScore > VALIDATION_RULES.CONFIDENCE_MAX
    ) {
      errors.push({
        field: 'confidenceScore',
        message: `Confidence score must be between ${VALIDATION_RULES.CONFIDENCE_MIN} and ${VALIDATION_RULES.CONFIDENCE_MAX}`,
        code: 'INVALID_CONFIDENCE_SCORE',
      })
    }
  } else {
    warnings.push('Confidence score not provided - will use default')
  }

  // Validate time spent
  if (
    answer.secondsSpent < VALIDATION_RULES.MIN_SECONDS_PER_ANSWER ||
    answer.secondsSpent > VALIDATION_RULES.MAX_SECONDS_PER_ANSWER
  ) {
    warnings.push(
      `Time spent (${answer.secondsSpent}s) seems unusual - check for timing issues`,
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate answer submission
 */
export function validateSubmission(request: SubmitTestResponseRequest): TestAttemptValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Check answers array
  if (!Array.isArray(request.answers) || request.answers.length === 0) {
    errors.push({
      field: 'answers',
      message: 'At least one answer is required',
      code: 'NO_ANSWERS',
    })
    return { valid: false, errors, warnings }
  }

  // Validate each answer
  request.answers.forEach((answer, idx) => {
    const validation = validateStudentAnswer(answer as StudentAnswer)
    if (!validation.valid) {
      errors.push(
        ...validation.errors.map((err) => ({
          ...err,
          field: `answers[${idx}].${err.field}`,
        })),
      )
    }
    warnings.push(...validation.warnings)
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate test can be analyzed
 * Checks that test is properly graded before analysis
 */
export function validateForAnalysis(attempt: TestAttempt): TestAttemptValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Must be graded
  if (!['graded', 'reviewed'].includes(attempt.status)) {
    errors.push({
      field: 'status',
      message: 'Test must be graded before analysis',
      code: 'NOT_GRADED',
    })
  }

  // Must have confidence data
  const answersWithConfidence = attempt.answers.filter((a) => a.confidenceScore !== undefined)
  if (answersWithConfidence.length === 0) {
    warnings.push('No confidence data available - analysis will use default assumptions')
  }

  if (answersWithConfidence.length < attempt.answers.length / 2) {
    warnings.push('Less than 50% of answers have confidence scores')
  }

  // Must have answers
  if (attempt.answers.length === 0) {
    errors.push({
      field: 'answers',
      message: 'Test has no answers to analyze',
      code: 'NO_ANSWERS',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Check if test attempt can be submitted (status transition)
 */
export function canSubmit(attempt: TestAttempt): { allowed: boolean; reason?: string } {
  if (attempt.status !== 'in_progress') {
    return {
      allowed: false,
      reason: `Cannot submit a test with status '${attempt.status}'`,
    }
  }

  if (attempt.answers.length === 0) {
    return {
      allowed: false,
      reason: 'Cannot submit test with no answers',
    }
  }

  return { allowed: true }
}

/**
 * Check if test attempt can be analyzed
 */
export function canAnalyze(attempt: TestAttempt): { allowed: boolean; reason?: string } {
  if (!['graded', 'reviewed'].includes(attempt.status)) {
    return {
      allowed: false,
      reason: 'Test must be graded before analysis',
    }
  }

  if (attempt.answers.length === 0) {
    return {
      allowed: false,
      reason: 'Cannot analyze test with no answers',
    }
  }

  return { allowed: true }
}

/**
 * Sanitize answers to prevent XSS/injection attacks
 */
export function sanitizeAnswer(answer: StudentAnswer): StudentAnswer {
  if (typeof answer.selectedAnswer === 'string') {
    return {
      ...answer,
      selectedAnswer: sanitizeText(answer.selectedAnswer),
    }
  }

  if (Array.isArray(answer.selectedAnswer)) {
    return {
      ...answer,
      selectedAnswer: answer.selectedAnswer.map((s) =>
        typeof s === 'string' ? sanitizeText(s) : s,
      ),
    }
  }

  return answer
}

/**
 * Sanitize text input
 */
function sanitizeText(text: string): string {
  if (!text) return ''
  
  // Remove potential XSS vectors
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, VALIDATION_RULES.MAX_ANSWER_LENGTH)
}

/**
 * Log validation results
 */
export function logValidation(
  result: TestAttemptValidationResult,
  context: string,
): void {
  if (!result.valid) {
    logger.error(`Validation failed: ${context}`, {
      errors: result.errors.map((e) => ({ field: e.field, code: e.code })),
    })
  }

  if (result.warnings.length > 0) {
    logger.warn(`Validation warnings: ${context}`, {
      warnings: result.warnings,
    })
  }
}
