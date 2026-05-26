/**
 * Course Management Models
 * Contains Course, CourseCalendar, and related types
 */

import { UserRole } from './entity-models';

// ============================================================================
// ENUMS
// ============================================================================

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum AssessmentStrategy {
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  BOTH = 'both',
  PROJECT = 'project',
}

export enum CourseTopicStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum ScheduledClassStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  RESCHEDULED = 'rescheduled',
}

export enum HolidayType {
  SCHOOL = 'school',
  TEACHER = 'teacher',
  PUBLIC = 'public',
}

// ============================================================================
// COURSES
// ============================================================================

export interface Course {
  id: string;
  schoolId: string;
  teacherId: string;
  gradeId: string;
  classId?: string;
  subjectId: string;
  title: string;
  description: string;
  syllabusId?: string;
  status: CourseStatus;
  startDate: Date;
  endDate: Date;
  totalEstimatedSessions: number;
  version: number;
  metadata?: {
    objectives: string[];
    prerequisites: string[];
    alignments: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCourseRequest {
  gradeId: string;
  classId?: string;
  subjectId: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  syllabusId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: CourseStatus;
  metadata?: Record<string, any>;
}

// ============================================================================
// COURSE CALENDARS
// ============================================================================

export interface TimeRange {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export interface ClassSchedule {
  monday?: TimeRange[];
  tuesday?: TimeRange[];
  wednesday?: TimeRange[];
  thursday?: TimeRange[];
  friday?: TimeRange[];
  saturday?: TimeRange[];
  sunday?: TimeRange[];
}

export interface HolidayPeriod {
  id?: string;
  name: string;
  startDate: Date;
  endDate: Date;
  type: HolidayType;
}

export interface CourseCalendar {
  id: string;
  schoolId: string;
  courseId: string;
  classSchedule: ClassSchedule;
  holidays: HolidayPeriod[];
  noClassDates: Date[];
  courseEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetCalendarRequest {
  classSchedule: ClassSchedule;
  holidays: HolidayPeriod[];
  noClassDates: Date[];
}

// ============================================================================
// COURSE TOPICS
// ============================================================================

export interface CourseTopic {
  id: string;
  courseId: string;
  topicId: string; // Reference to syllabus_topics
  schoolId: string;
  orderIndex: number;
  estimatedSessions: number;
  dependsOnTopicIds: string[];
  learningObjectives: string[];
  assessmentStrategy: AssessmentStrategy;
  status: CourseTopicStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddCourseTopicRequest {
  topicId: string;
  orderIndex: number;
  estimatedSessions: number;
  dependsOnTopicIds?: string[];
  assessmentStrategy?: AssessmentStrategy;
}

export interface BulkAddCourseTopicsRequest {
  topics: AddCourseTopicRequest[];
}

// ============================================================================
// SCHEDULED CLASSES
// ============================================================================

export interface ScheduledClass {
  id: string;
  learningPlanId: string;
  topicId: string;
  scheduledDate: Date;
  scheduledTime?: TimeRange;
  isRemediationClass: boolean;
  estimatedDurationMinutes: number;
  status: ScheduledClassStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// COURSE PROGRESS
// ============================================================================

export interface StudentCourseProgress {
  courseId: string;
  studentId: string;
  totalTopics: number;
  completedTopics: number;
  averageMastery: number;
  estimatedCompletionDate: Date;
  nextScheduledClass?: ScheduledClass;
}

export interface CourseStats {
  courseId: string;
  totalStudents: number;
  averageProgress: number;
  lastUpdated: Date;
}

// ============================================================================
// DIAGNOSTIC TEST MODELS
// ============================================================================

export interface DiagnosticQuestion {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  topic: string;
  difficulty: number; // 1-10
}

export interface DiagnosticTestResponse {
  questionId: string;
  selectedOptionIndex: number;
  responseTime: number; // Seconds
  isCorrect: boolean;
}

export interface DiagnosticTestAnalysis {
  totalQuestions: number;
  correctAnswers: number;
  score: number; // 0-100
  topicScores: Record<string, number>;
  weakAreas: string[];
  strongAreas: string[];
  timePerQuestion: number; // Average seconds
}

export interface DiagnosticTest {
  id: string;
  studentId: string;
  schoolId: string;
  previousGradeId: string;
  sourceGrade: string;
  questions: DiagnosticQuestion[];
  studentResponses?: DiagnosticTestResponse[];
  analysisResult?: DiagnosticTestAnalysis;
  completedAt?: Date;
  tookTime?: number; // Minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateDiagnosticTestRequest {
  previousGradeId: string;
  numQuestions?: number;
  topicFilter?: string[];
}

// ============================================================================
// LEARNING DNA MODELS (Enhanced)
// ============================================================================

export enum PaceType {
  FAST = 'fast',
  MEDIUM = 'medium',
  SLOW = 'slow',
}

export enum MistakeType {
  CONCEPTUAL = 'conceptual',
  CARELESS = 'careless',
  MIXED = 'mixed',
}

export enum PreferredStyle {
  VISUAL = 'visual',
  TEXT = 'text',
  INTERACTIVE = 'interactive',
  STORY = 'story',
}

export enum TeachingStyle {
  FRIENDLY_TUTOR = 'friendly_tutor',
  STRICT_INSTRUCTOR = 'strict_instructor',
  STORYTELLER = 'storyteller',
  SOCRATIC = 'socratic',
}

export interface LearningProfile {
  paceType: PaceType;
  mistakeType: MistakeType;
  preferredStyle: PreferredStyle;
  recommendedTeachingStyle: TeachingStyle;
}

export interface RemediationTopic {
  topicId: string;
  reason: string; // 'scored_below_70', 'self_rated_weak'
  priority: 'high' | 'medium' | 'low';
}

export interface LearningDNA {
  id: string;
  studentId: string;
  schoolId: string;
  generationMethod: 'diagnostic' | 'initial_assessment' | 'manual';
  diagnosticConfidence: number;
  reportedConfidence: number;
  confidenceAlignment: 'aligned' | 'underestimated' | 'overestimated';
  learningProfile: LearningProfile;
  remediationNeeded: RemediationTopic[];
  generatedAt: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateLearningDNARequest {
  studentId: string;
  diagnosticTestId: string;
  selfAssessmentData: {
    strengths: string[];
    weaknesses: string[];
    confidenceScore: number;
  };
}

// ============================================================================
// LEARNING PLAN MODELS (Enhanced)
// ============================================================================

export enum LearningPlanStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
}

export interface SyllabusTopicSnapshot {
  topicId: string;
  title: string;
  learningObjectives: string[];
  estimatedSessions: number;
}

export interface RemediationTopicPlan {
  topicId: string;
  title: string;
  prerequisiteOf: string; // Which main topic it remediates for
  position: 'before' | 'parallel';
  estimatedDays: number;
}

export interface MainTopicPlan {
  topicId: string;
  title: string;
  estimatedDays: number;
  adjustedDifficulty: number; // 1-10
  differentiation: string;
}

export interface PersonalizedSyllabus {
  remediationTopics: RemediationTopicPlan[];
  mainTopics: MainTopicPlan[];
}

export interface LearningPlan {
  id: string;
  studentId: string;
  schoolId: string;
  courseId: string;
  learningDnaId: string;
  basedOnSyllabusId: string;
  originalSyllabus: SyllabusTopicSnapshot[];
  personalizedSyllabus: PersonalizedSyllabus;
  scheduledSessions: ScheduledClass[];
  status: LearningPlanStatus;
  startDate: Date;
  projectedCompletionDate: Date;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateLearningPlanRequest {
  studentId: string;
  courseId: string;
  learningDnaId: string;
  basedOnSyllabusId: string;
}

// ============================================================================
// STUDENT ONBOARDING MODELS
// ============================================================================

export enum OnboardingStep {
  SELF_ASSESSMENT = 1,
  DIAGNOSTIC_TEST = 2,
  REVIEW_RESULTS = 3,
  REVIEW_PLAN = 4,
  COMPLETION = 5,
}

export enum OnboardingStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface SelfAssessmentData {
  strengths: string[];
  weaknesses: string[];
  confidenceScore: number; // 0-100
}

export interface StudentOnboarding {
  id: string;
  studentId: string;
  schoolId: string;
  currentStep: number;
  completedSteps: number[];
  currentGrade: string;
  previousGrade: string;
  selfAssessment?: SelfAssessmentData;
  diagnosticTestId?: string;
  diagnosticScore?: number;
  diagnosticCompletedAt?: Date;
  learningDnaId?: string;
  learningPlanId?: string;
  status: OnboardingStatus;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Step1Request {
  currentGrade: string;
  previousGrade: string;
  selfAssessment: SelfAssessmentData;
}

// ============================================================================
// PROGRESS TRACKING MODELS
// ============================================================================

export interface StudentCourseProgressDetail {
  courseId: string;
  studentId: string;
  courseName: string;
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
  averageMastery: number; // 0-100
  quizzesTaken: number;
  averageQuizScore: number;
  estimatedCompletionDate: Date;
  daysRemaining: number;
  nextScheduledClass?: ScheduledClass;
  recentQuizzes: QuizAttempt[];
}

export interface QuizAttempt {
  id: string;
  studentId: string;
  topicId: string;
  score: number; // 0-100
  attemptDate: Date;
  timeSpent: number; // Minutes
}

export interface StudentProgress {
  studentId: string;
  firstName: string;
  lastName: string;
  grade: string;
  courses: StudentCourseProgressDetail[];
  overallProgress: number; // Average across all courses
  riskIndicators: string[];
  learningDna?: LearningDNA;
}

// ============================================================================
// PARENT VIEW MODELS
// ============================================================================

export interface ParentChildProgress {
  childId: string;
  childName: string;
  grade: string;
  courses: Course[];
  enrolledCourses: number;
  completedCourses: number;
  averageMastery: number;
  nextClassDate?: Date;
  recentGrades: Grade[];
  learningDnaSummary: string;
}

export interface Grade {
  id: string;
  topicName: string;
  score: number;
  date: Date;
  quizAttemptId: string;
}

// ============================================================================
// OPENMAIC INTEGRATION MODELS
// ============================================================================

export interface OpenMAICContext {
  studentId: string;
  topicId: string;
  topicTitle: string;
  gradeLevel: string;
  learningDna: LearningDNA;
  difficulty: number; // 1-10
  previousGradeContent?: string;
  isRemediation: boolean;
}

export interface ClassroomSession {
  id: string;
  studentId: string;
  topicId: string;
  scheduledClassId?: string;
  classroomHtml: string; // Rendered classroom
  transcript: string;
  videoUrl?: string;
  audioUrl?: string;
  metadata: {
    difficulty: number;
    teachingStyle: string;
    generatedAt: Date;
    generatedBy: string;
    generationModel: string;
  };
  createdAt: Date;
}

export interface GenerateSessionRequest {
  studentId: string;
  topicId: string;
  scheduledClassId: string;
  learningDnaId: string;
  difficulty?: number;
}
