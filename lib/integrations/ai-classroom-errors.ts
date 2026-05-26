/**
 * AI Classroom Integration Error Handling Utilities
 * Standardized error responses and recovery strategies
 */

import { createLogger } from '@/lib/logger';
import type { AIClassroomErrorResponse, AIClassroomErrorCode } from '@/lib/types/ai-classroom';

const logger = createLogger('AIClassroomErrors');

/**
 * Custom error class for AI classroom operations
 */
export class AIClassroomError extends Error {
  constructor(
    public code: AIClassroomErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIClassroomError';
  }
}

/**
 * Standardized error response formatter
 */
export function formatErrorResponse(
  code: AIClassroomErrorCode,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string
): AIClassroomErrorResponse {
  return {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
}

/**
 * Map error to HTTP status code
 */
export function getStatusCodeForError(error: AIClassroomError): number {
  const statusMap: Record<AIClassroomErrorCode, number> = {
    // Validation errors (400)
    INVALID_STUDENT_ID: 400,
    INVALID_TOPIC_ID: 400,
    INVALID_SESSION_DURATION: 400,
    INVALID_TEACHING_STYLE: 400,

    // Authorization errors (403)
    UNAUTHORIZED_ACCESS: 403,
    TENANT_MISMATCH: 403,
    INSUFFICIENT_PERMISSIONS: 403,

    // OpenMAIC errors (5xx)
    GENERATION_FAILED: 503,
    GENERATION_TIMEOUT: 504,
    GENERATION_QUOTA_EXCEEDED: 429,
    MEDIA_GENERATION_FAILED: 502,

    // Data errors (422)
    SESSION_DATA_INVALID: 422,
    SESSION_DATA_INCOMPLETE: 422,
    TRANSCRIPTION_FAILED: 422,

    // System errors (500)
    DATABASE_ERROR: 500,
    INTERNAL_ERROR: 500,
  };

  return statusMap[error.code] || error.statusCode;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: AIClassroomError): boolean {
  const retryableCodes: AIClassroomErrorCode[] = [
    'GENERATION_TIMEOUT',
    'GENERATION_FAILED', // May be transient
    'MEDIA_GENERATION_FAILED', // May recover
    'DATABASE_ERROR', // Transient connection issues
  ];

  return retryableCodes.includes(error.code);
}

/**
 * Get retry strategy for error
 */
export function getRetryStrategy(
  error: AIClassroomError
): { maxRetries: number; delayMs: number; backoffMultiplier: number } {
  const strategies: Record<AIClassroomErrorCode, any> = {
    // Timeout: retry quickly, 3 times
    GENERATION_TIMEOUT: {
      maxRetries: 3,
      delayMs: 1000,
      backoffMultiplier: 2,
    },

    // Generation failed: retry with backoff
    GENERATION_FAILED: {
      maxRetries: 2,
      delayMs: 2000,
      backoffMultiplier: 2,
    },

    // Media generation: can retry but skip media
    MEDIA_GENERATION_FAILED: {
      maxRetries: 1,
      delayMs: 1000,
      backoffMultiplier: 1,
    },

    // Database: retry with exponential backoff
    DATABASE_ERROR: {
      maxRetries: 3,
      delayMs: 500,
      backoffMultiplier: 2,
    },

    // Non-retryable defaults
    INVALID_STUDENT_ID: { maxRetries: 0, delayMs: 0, backoffMultiplier: 0 },
    INVALID_TOPIC_ID: { maxRetries: 0, delayMs: 0, backoffMultiplier: 0 },
    INVALID_SESSION_DURATION: { maxRetries: 0, delayMs: 0, backoffMultiplier: 0 },
    INVALID_TEACHING_STYLE: { maxRetries: 0, delayMs: 0, backoffMultiplier: 0 },
    UNAUTHORIZED_ACCESS: { maxRetries: 0, delayMs: 0, backoffMultiplier: 0 },
    TENANT_MISMATCH: { maxRetries: 0, delayMs: 0, backoffMultiplier: 0 },
    INSUFFICIENT_PERMISSIONS: { maxRetries: 0, delayMs: 0, backoffMultiplier: 0 },
    GENERATION_QUOTA_EXCEEDED: { maxRetries: 0, delayMs: 0, backoffMultiplier: 0 },
    SESSION_DATA_INVALID: { maxRetries: 0, delayMs: 0, backoffMultiplier: 0 },
    SESSION_DATA_INCOMPLETE: { maxRetries: 0, delayMs: 0, backoffMultiplier: 0 },
    TRANSCRIPTION_FAILED: { maxRetries: 1, delayMs: 1000, backoffMultiplier: 1 },
    INTERNAL_ERROR: { maxRetries: 1, delayMs: 1000, backoffMultiplier: 1 },
  };

  return strategies[error.code] || { maxRetries: 0, delayMs: 0, backoffMultiplier: 0 };
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AIClassroomError): string {
  const messages: Record<AIClassroomErrorCode, string> = {
    // Validation
    INVALID_STUDENT_ID: 'Student ID is invalid. Please check and try again.',
    INVALID_TOPIC_ID: 'Topic ID is invalid. Please select a valid topic.',
    INVALID_SESSION_DURATION: 'Session duration must be between 5 and 120 minutes.',
    INVALID_TEACHING_STYLE: 'Teaching style is invalid. Please choose from available options.',

    // Authorization
    UNAUTHORIZED_ACCESS: 'You do not have permission to access this resource.',
    TENANT_MISMATCH: 'This resource belongs to a different school.',
    INSUFFICIENT_PERMISSIONS: 'Your role does not have permission for this action.',

    // Generation
    GENERATION_FAILED: 'Failed to generate the classroom session. Please try again.',
    GENERATION_TIMEOUT: 'The session generation took too long. Please try again.',
    GENERATION_QUOTA_EXCEEDED: 'Generation limit exceeded. Please try again later.',
    MEDIA_GENERATION_FAILED: 'Failed to generate some media. A text-only session will be created.',

    // Data
    SESSION_DATA_INVALID: 'The generated session data is invalid. Please try again.',
    SESSION_DATA_INCOMPLETE: 'The generated session is missing required data. Please try again.',
    TRANSCRIPTION_FAILED: 'Failed to transcribe the session. Please try again.',

    // System
    DATABASE_ERROR: 'A database error occurred. Please try again.',
    INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
  };

  return messages[error.code] || error.message;
}

/**
 * Log error with context
 */
export function logAIClassroomError(
  error: AIClassroomError,
  context?: Record<string, unknown>
): void {
  const logData = {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    details: error.details,
    isRetryable: isRetryableError(error),
    ...context,
  };

  if (error.statusCode >= 500) {
    logger.error('AI Classroom Error', logData);
  } else if (error.statusCode >= 400) {
    logger.warn('AI Classroom Validation/Authorization Error', logData);
  } else {
    logger.info('AI Classroom Error', logData);
  }
}

/**
 * Validate student ID
 */
export function validateStudentId(studentId: string): boolean {
  if (!studentId || typeof studentId !== 'string') return false;
  // UUID format check (basic)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
}

/**
 * Validate topic ID
 */
export function validateTopicId(topicId: string): boolean {
  if (!topicId || typeof topicId !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId);
}

/**
 * Validate session duration
 */
export function validateSessionDuration(duration: number): boolean {
  return Number.isInteger(duration) && duration >= 5 && duration <= 120;
}

/**
 * Validate teaching style
 */
export function validateTeachingStyle(style: string): boolean {
  const validStyles = ['friendly', 'strict', 'storytelling', 'socratic'];
  return validStyles.includes(style.toLowerCase());
}

/**
 * Validate school ID (basic)
 */
export function validateSchoolId(schoolId: string): boolean {
  if (!schoolId || typeof schoolId !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId);
}

/**
 * Create standard error responses
 */
export const ErrorResponses = {
  invalidStudentId: (details?: string) =>
    new AIClassroomError(
      'INVALID_STUDENT_ID',
      'Invalid student ID',
      400,
      { reason: details || 'Student ID must be a valid UUID' }
    ),

  invalidTopicId: (details?: string) =>
    new AIClassroomError(
      'INVALID_TOPIC_ID',
      'Invalid topic ID',
      400,
      { reason: details || 'Topic ID must be a valid UUID' }
    ),

  invalidDuration: (duration: number) =>
    new AIClassroomError(
      'INVALID_SESSION_DURATION',
      'Invalid session duration',
      400,
      { provided: duration, min: 5, max: 120 }
    ),

  invalidTeachingStyle: (style: string) =>
    new AIClassroomError(
      'INVALID_TEACHING_STYLE',
      'Invalid teaching style',
      400,
      { provided: style, valid: ['friendly', 'strict', 'storytelling', 'socratic'] }
    ),

  unauthorized: () =>
    new AIClassroomError(
      'UNAUTHORIZED_ACCESS',
      'User is not authorized to access this resource',
      403
    ),

  tenantMismatch: (resourceSchool: string, userSchool: string) =>
    new AIClassroomError(
      'TENANT_MISMATCH',
      'Resource belongs to a different school',
      403,
      { resourceSchool, userSchool }
    ),

  generationFailed: (reason?: string) =>
    new AIClassroomError(
      'GENERATION_FAILED',
      'Failed to generate classroom session',
      503,
      { reason }
    ),

  generationTimeout: () =>
    new AIClassroomError(
      'GENERATION_TIMEOUT',
      'Classroom generation timed out',
      504,
      { retryable: true }
    ),

  sessionDataInvalid: (errors: string[]) =>
    new AIClassroomError(
      'SESSION_DATA_INVALID',
      'Generated session data is invalid',
      422,
      { errors }
    ),

  databaseError: (reason?: string) =>
    new AIClassroomError(
      'DATABASE_ERROR',
      'Database operation failed',
      500,
      { reason, retryable: true }
    ),

  internalError: (reason?: string) =>
    new AIClassroomError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      { reason }
    ),
};

export default {
  AIClassroomError,
  formatErrorResponse,
  getStatusCodeForError,
  isRetryableError,
  getRetryStrategy,
  getUserFriendlyMessage,
  logAIClassroomError,
  validateStudentId,
  validateTopicId,
  validateSessionDuration,
  validateTeachingStyle,
  validateSchoolId,
  ErrorResponses,
};
