/**
 * TEST ATTEMPT AND CONFIDENCE ANALYSIS TYPES
 * 
 * Core models for student test attempts and confidence vs performance analysis.
 * Enables tracking of student answers, confidence scores, and learning readiness.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum AnswerType {
  MULTIPLE_CHOICE = 'multiple_choice',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
  MATCHING = 'matching',
  TRUE_FALSE = 'true_false',
  FILL_BLANK = 'fill_blank'
}

export enum ConfidenceLevel {
  VERY_UNCERTAIN = 1,
  UNCERTAIN = 2,
  SOMEWHAT_CONFIDENT = 3,
  CONFIDENT = 4,
  VERY_CONFIDENT = 5
}

export enum ReadinessLevel {
  READY = 'ready',
  OVERCONFIDENT = 'overconfident',
  UNDERCONFIDENT = 'underconfident',
  SUPPORT_REQUIRED = 'support_required'
}

export enum PerformanceStatus {
  EXCELLENT = 'excellent',         // 90%+
  GOOD = 'good',                   // 80-89%
  SATISFACTORY = 'satisfactory',   // 70-79%
  NEEDS_IMPROVEMENT = 'needs_improvement', // < 70%
  NOT_YET_ATTEMPTED = 'not_yet_attempted'
}

export enum ConfidenceMismatchType {
  WELL_CALIBRATED = 'well_calibrated',           // Confidence matches performance
  OVERCONFIDENT = 'overconfident',               // High confidence, low performance
  UNDERCONFIDENT = 'underconfident',             // Low confidence, high performance
  INCONSISTENT = 'inconsistent'                  // Varies wildly
}

// ============================================================================
// QUESTION AND ANSWER MODELS
// ============================================================================

export interface TestQuestion {
  id: string
  testId: string
  topicId: string
  questionText: string
  answerType: AnswerType
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  orderIndex: number
  
  // Multiple choice options
  options?: {
    id: string
    text: string
    isCorrect: boolean
  }[]
  
  // Correct answer(s)
  correctAnswer: string | string[]
  correctAnswerId?: string | string[]
  
  // Grading
  pointsValue: number
  rubric?: string  // For essay/short answer grading guidance
  
  createdAt: Date
  updatedAt: Date
}

export interface StudentAnswer {
  id: string
  quizAttemptId: string
  questionId: string
  topicId: string
  
  // What student selected/answered
  selectedAnswer: string | string[] | { [key: string]: string }
  selectedAnswerId?: string | string[]
  
  // Confidence (1-5 scale)
  confidenceScore?: ConfidenceLevel
  
  // Timing
  secondsSpent: number
  startedAt: Date
  submittedAt: Date
  
  // Grading
  isCorrect: boolean
  pointsEarned: number
  gradedBy?: 'auto' | 'human' | 'llm'
  gradedAt?: Date
  gradingFeedback?: string
  
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// TEST ATTEMPT MODELS
// ============================================================================

export interface TestAttempt {
  id: string
  quizAttemptId?: string  // Link to existing quiz attempt if from approved diagnostic
  studentId: string
  schoolId: string
  testId: string
  testName: string
  testType: 'diagnostic' | 'formative' | 'summative' | 'practice'
  
  // Status tracking
  status: 'in_progress' | 'submitted' | 'graded' | 'reviewed'
  
  // Timing
  startedAt: Date
  submittedAt?: Date
  completedAt?: Date
  timeAllowedMinutes?: number
  
  // Overall performance
  totalPoints: number
  pointsEarned: number
  percentageScore: number
  performanceStatus: PerformanceStatus
  
  // Answers
  answers: StudentAnswer[]
  totalQuestionsAnswered: number
  totalQuestionsCorrect: number
  
  createdAt: Date
  updatedAt: Date
}

export interface TestAttemptRow {
  id: string
  quiz_attempt_id?: string
  student_id: string
  school_id: string
  test_id: string
  test_name: string
  test_type: 'diagnostic' | 'formative' | 'summative' | 'practice'
  status: 'in_progress' | 'submitted' | 'graded' | 'reviewed'
  started_at: Date
  submitted_at?: Date
  completed_at?: Date
  time_allowed_minutes?: number
  total_points: number
  points_earned: number
  percentage_score: number
  performance_status: PerformanceStatus
  total_questions_answered: number
  total_questions_correct: number
  answers_json: string  // JSON stringified StudentAnswer[]
  created_at: Date
  updated_at: Date
}

// ============================================================================
// TOPIC-LEVEL PERFORMANCE
// ============================================================================

export interface TopicPerformance {
  topicId: string
  topicName: string
  totalQuestions: number
  correctAnswers: number
  percentageCorrect: number
  performanceStatus: PerformanceStatus
  averageConfidence: number
  timeSpentSeconds: number
  
  // Confidence vs Performance analysis for this topic
  confidenceVsPerformance: {
    averageStudentConfidence: number
    actualPercentageScore: number
    mismatchScore: number  // |confidence - actual| 
    mismatchType: ConfidenceMismatchType
  }
}

export interface TopicPerformanceRow {
  topic_id: string
  topic_name: string
  total_questions: number
  correct_answers: number
  percentage_correct: number
  performance_status: PerformanceStatus
  average_confidence: number
  time_spent_seconds: number
  average_student_confidence: number
  actual_percentage_score: number
  mismatch_score: number
  mismatch_type: ConfidenceMismatchType
}

// ============================================================================
// CONFIDENCE ANALYSIS MODELS
// ============================================================================

export interface ConfidenceDataPoint {
  topicId: string
  topicName: string
  studentConfidence: number  // Average confidence on questions for this topic (1-5)
  actualPerformance: number   // Actual % correct (0-100)
  mismatchScore: number       // |confidence - performance|, both normalized to 0-100
  questionsCount: number
  isUnderprepared: boolean    // Low confidence but needed by curriculum
  isAreas: boolean            // Low performance in required topics
}

export interface ConfidenceAnalysis {
  testAttemptId: string
  studentId: string
  schoolId: string
  
  // Overall calibration
  overallConfidence: number  // Average confidence (1-5 scale)
  overallPerformance: number  // Overall % correct (0-100 scale)
  overallMismatchScore: number  // Normalized mismatch (0-100)
  
  // Classification
  readinessLevel: ReadinessLevel
  confidenceMismatchType: ConfidenceMismatchType
  
  // Topic breakdown
  topicAnalysis: ConfidenceDataPoint[]
  
  // Key insights
  strongTopics: {
    topicId: string
    topicName: string
    confidence: number
    performance: number
    wellCalibrated: boolean
  }[]
  
  weakTopics: {
    topicId: string
    topicName: string
    confidence: number
    performance: number
    reason: 'underconfident' | 'overconfident' | 'poorly_prepared'
  }[]
  
  // Readiness assessment
  readinessAssessment: {
    level: ReadinessLevel
    explanation: string
    reasonKey: string  // 'ready' | 'overconfident_perform_well' | 'underconfident_perform_well' | 'underconfident_perform_poor' | 'overconfident_perform_poor' | 'no_confidence_data'
    recommendedActions: string[]
  }
  
  // Mismatch detail
  mismatchAnalysis: {
    type: ConfidenceMismatchType
    severity: 'low' | 'moderate' | 'high'
    explanation: string
    affectedTopics: string[]
  }
  
  analyzedAt: Date
  createdAt: Date
}

// ============================================================================
// REQUEST/RESPONSE DTOS
// ============================================================================

export interface StartTestAttemptRequest {
  testId: string
  timeAllowedMinutes?: number
}

export interface SubmitAnswerRequest {
  questionId: string
  selectedAnswer: string | string[] | { [key: string]: string }
  confidenceScore?: ConfidenceLevel
  secondsSpent: number
}

export interface SubmitTestResponseRequest {
  answers: SubmitAnswerRequest[]
  completedAt?: Date
}

export interface TestAttemptResponse {
  success: boolean
  data?: TestAttempt
  error?: string
}

export interface AnalyzeTestAttemptRequest {
  testAttemptId: string
  includeTopicBreakdown?: boolean
}

export interface ConfidenceAnalysisResponse {
  success: boolean
  data?: ConfidenceAnalysis
  error?: string
  warnings?: string[]
}

export interface TestAttemptListResponse {
  success: boolean
  data?: TestAttempt[]
  pagination?: {
    total: number
    limit: number
    offset: number
  }
  error?: string
}

export interface StudentTestDashboardData {
  recentAttempts: TestAttempt[]
  overallPerformance: {
    averageScore: number
    totalTestsTaken: number
    strengthAreas: string[]
    improvementAreas: string[]
  }
  confidenceAnalysis: {
    lastAnalysis?: ConfidenceAnalysis
    trend: 'improving' | 'declining' | 'stable'
    readinessForNextTopic: ReadinessLevel
  }
  topicProgression: TopicPerformance[]
}

export interface TeacherTestDashboardData {
  classAverageScore: number
  studentCount: number
  readinessBreakdown: {
    ready: number
    overconfident: number
    underconfident: number
    supportRequired: number
  }
  topicStrengths: {
    topicName: string
    averagePerformance: number
    studentCount: number
  }[]
  topicWeaknesses: {
    topicName: string
    averagePerformance: number
    studentCount: number
  }[]
  studentsNeedingSupport: {
    studentId: string
    studentName: string
    readinessLevel: ReadinessLevel
    averageScore: number
    primaryWeaknessTopics: string[]
  }[]
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface TestAttemptValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: string[]
}

// ============================================================================
// INTERNAL MODELS (for service layer calculations)
// ============================================================================

export interface ConfidenceMetrics {
  averageConfidence: number
  minConfidence: number
  maxConfidence: number
  confidenceStdDev: number
  questionsWithConfidence: number
  questionsWithoutConfidence: number
}

export interface PerformanceMetrics {
  percentageCorrect: number
  totalPoints: number
  pointsEarned: number
  questionsCorrect: number
  totalQuestions: number
}

// Calculated mismatch analysis
export interface MismatchCalculation {
  mismatchScore: number  // Absolute difference between confidence and performance
  mismatchType: ConfidenceMismatchType
  severity: 'low' | 'moderate' | 'high'
  explanation: string
}

export interface ReadinessCalculation {
  level: ReadinessLevel
  confidence: number
  performance: number
  reason: string
  actionItems: string[]
}
