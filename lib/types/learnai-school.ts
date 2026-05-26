export type LearnAIRole =
  | 'saas_admin'
  | 'principal'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'accountant'
  | 'supervisor';

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  schoolId?: string;
}

export interface Role {
  id: string;
  key: LearnAIRole;
  label: string;
}

export interface School {
  id: string;
  name: string;
  code: string;
  timezone: string;
}

export interface SchoolProfile {
  schoolId: string;
  principalUserId: string;
  academicYear: string;
}

export interface SchoolMembership {
  id: string;
  schoolId: string;
  userId: string;
  roleId: string;
}

export interface PrincipalProfile {
  userId: string;
  schoolId: string;
}

export interface TeacherProfile {
  userId: string;
  schoolId: string;
  subjectIds: string[];
}

export interface StudentProfile {
  userId: string;
  schoolId: string;
  gradeId: string;
  classId: string;
  parentUserId: string;
}

export interface ParentProfile {
  userId: string;
  schoolId: string;
  studentUserIds: string[];
}

export interface AccountantProfile {
  userId: string;
  schoolId: string;
}

export interface SupervisorProfile {
  userId: string;
  schoolId: string;
}

export interface Grade {
  id: string;
  schoolId: string;
  name: string;
  level: number;
}

export interface SchoolClass {
  id: string;
  schoolId: string;
  gradeId: string;
  name: string;
  teacherUserId: string;
}

export interface Subject {
  id: string;
  schoolId: string;
  name: string;
}

export interface Syllabus {
  id: string;
  schoolId: string;
  gradeId: string;
  classId: string;
  subjectId: string;
  teacherUserId: string;
  enrichmentEnabled: boolean;
}

export interface SyllabusUnit {
  id: string;
  syllabusId: string;
  name: string;
  order: number;
}

export interface Topic {
  id: string;
  syllabusUnitId: string;
  name: string;
  order: number;
}

export interface TopicDependency {
  id: string;
  topicId: string;
  prerequisiteTopicId: string;
}

export interface LearningObjective {
  id: string;
  topicId: string;
  description: string;
}

export interface Assignment {
  id: string;
  syllabusId: string;
  title: string;
}

export interface Quiz {
  id: string;
  syllabusId: string;
  title: string;
}

export interface Exam {
  id: string;
  syllabusId: string;
  title: string;
}

export interface StudentSelfAssessment {
  id: string;
  studentUserId: string;
  topicConfidence: Record<string, number>;
}

export interface DiagnosticTest {
  id: string;
  syllabusId: string;
  studentUserId: string;
  status: 'draft' | 'teacher_reviewed' | 'completed';
}

export interface DiagnosticQuestion {
  id: string;
  diagnosticTestId: string;
  topicId: string;
  prompt: string;
}

export interface QuestionOption {
  id: string;
  diagnosticQuestionId: string;
  text: string;
  isCorrect: boolean;
}

export interface TeacherQuestionReview {
  id: string;
  diagnosticTestId: string;
  teacherUserId: string;
  approved: boolean;
  note?: string;
}

export interface TestAttempt {
  id: string;
  diagnosticTestId: string;
  studentUserId: string;
  score: number;
}

export interface TestAnswer {
  id: string;
  testAttemptId: string;
  diagnosticQuestionId: string;
  selectedOptionId: string;
}

export interface ConfidenceAnalysis {
  id: string;
  studentUserId: string;
  overconfidenceTopics: string[];
  underconfidenceTopics: string[];
}

export interface LearningPlan {
  id: string;
  studentUserId: string;
  syllabusId: string;
}

export interface LearningPlanStep {
  id: string;
  learningPlanId: string;
  topicId: string;
  teachingStyle: 'visual' | 'step_by_step' | 'story' | 'practice_focused';
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface LearningDNA {
  id: string;
  studentUserId: string;
  preferredStyle: LearningPlanStep['teachingStyle'];
  confidenceTrend: 'low' | 'medium' | 'high';
  pace: 'slow' | 'medium' | 'fast';
}

export interface TopicMastery {
  id: string;
  studentUserId: string;
  topicId: string;
  mastery: number;
}

export interface StudentProgress {
  id: string;
  studentUserId: string;
  completedStepIds: string[];
  currentStepId?: string;
}

export interface RevisionSchedule {
  id: string;
  studentUserId: string;
  topicId: string;
  nextRevisionAt: string;
}

export interface LearnAISession {
  id: string;
  studentUserId: string;
  teacherUserId: string;
  syllabusId: string;
  learningPlanStepId: string;
  openMAICClassroomId: string;
  approvedTopicIds: string[];
}

export interface SessionMedia {
  id: string;
  learnAISessionId: string;
  kind: 'video' | 'audio';
  url: string;
}

export interface SessionTranscript {
  id: string;
  learnAISessionId: string;
  transcript: string;
}

export interface SessionInteractionLog {
  id: string;
  learnAISessionId: string;
  eventType: string;
  payload: string;
}

export interface SessionQuizResult {
  id: string;
  learnAISessionId: string;
  score: number;
  total: number;
}

export interface Subscription {
  id: string;
  schoolId: string;
  plan: string;
  status: 'active' | 'paused';
}

export interface Payment {
  id: string;
  schoolId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'due';
}

export interface APIKey {
  id: string;
  schoolId: string;
  provider: string;
  maskedKey: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface LearnAIPlatformData {
  users: User[];
  roles: Role[];
  schools: School[];
  schoolProfiles: SchoolProfile[];
  memberships: SchoolMembership[];
  principalProfiles: PrincipalProfile[];
  teacherProfiles: TeacherProfile[];
  studentProfiles: StudentProfile[];
  parentProfiles: ParentProfile[];
  accountantProfiles: AccountantProfile[];
  supervisorProfiles: SupervisorProfile[];
  grades: Grade[];
  classes: SchoolClass[];
  subjects: Subject[];
  syllabi: Syllabus[];
  syllabusUnits: SyllabusUnit[];
  topics: Topic[];
  topicDependencies: TopicDependency[];
  learningObjectives: LearningObjective[];
  assignments: Assignment[];
  quizzes: Quiz[];
  exams: Exam[];
  selfAssessments: StudentSelfAssessment[];
  diagnosticTests: DiagnosticTest[];
  diagnosticQuestions: DiagnosticQuestion[];
  questionOptions: QuestionOption[];
  teacherQuestionReviews: TeacherQuestionReview[];
  testAttempts: TestAttempt[];
  testAnswers: TestAnswer[];
  confidenceAnalyses: ConfidenceAnalysis[];
  learningPlans: LearningPlan[];
  learningPlanSteps: LearningPlanStep[];
  learningDNAs: LearningDNA[];
  topicMasteries: TopicMastery[];
  studentProgress: StudentProgress[];
  revisionSchedules: RevisionSchedule[];
  learnAISessions: LearnAISession[];
  sessionMedia: SessionMedia[];
  sessionTranscripts: SessionTranscript[];
  sessionInteractionLogs: SessionInteractionLog[];
  sessionQuizResults: SessionQuizResult[];
  subscriptions: Subscription[];
  payments: Payment[];
  apiKeys: APIKey[];
  auditLogs: AuditLog[];
  notifications: Notification[];
}

export interface DashboardMetric {
  label: string;
  value: number;
}

export interface DashboardSeriesPoint {
  label: string;
  value: number;
}

export interface RoleDashboardData {
  role: LearnAIRole;
  title: string;
  metrics: DashboardMetric[];
  weakTopicHeatmap: DashboardSeriesPoint[];
  masteryTrend: DashboardSeriesPoint[];
}

export interface SessionGenerationInput {
  studentUserId: string;
  teacherUserId: string;
  syllabusId: string;
  requestedTopicId: string;
  preferredStyle: LearningPlanStep['teachingStyle'];
  difficulty: LearningPlanStep['difficulty'];
}

export interface DiagnosticGenerationInput {
  studentUserId: string;
  syllabusId: string;
}

export interface DiagnosticSubmissionInput {
  studentUserId: string;
  diagnosticTestId: string;
  answers: Record<string, string>;
}

export interface DiagnosticInsight {
  scorePercent: number;
  strengths: string[];
  gaps: string[];
  overconfidenceTopics: string[];
  underconfidenceTopics: string[];
}

export interface PersonalizedPlanInput {
  studentUserId: string;
  syllabusId: string;
  insight: DiagnosticInsight;
}
