/**
 * Syllabus types - Teacher-created course content
 * Comprehensive system with grade, subject, topics, learning objectives, difficulty, dependencies
 */

// ============================================================================
// ENUMS & TYPES
// ============================================================================

export type SyllabusStatus = 'draft' | 'published' | 'archived';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// ============================================================================
// GRADE & SUBJECT (Foundational)
// ============================================================================

export interface Grade {
  id: string;
  schoolId: string;
  name: string;
  level: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subject {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// MAIN SYLLABUS ENTITY
// ============================================================================

export interface Syllabus {
  id: string;
  schoolId: string;
  gradeId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  status: SyllabusStatus;
  version: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSyllabusRequest {
  gradeId: string;
  subjectId: string;
  title: string;
  units?: SyllabusUnitInput[];
}

export interface UpdateSyllabusRequest {
  title?: string;
  status?: SyllabusStatus;
}

export interface PublishSyllabusRequest {
  changeNote?: string;
}

// ============================================================================
// SYLLABUS UNIT (Organizational grouping)
// ============================================================================

export interface SyllabusUnit {
  id: string;
  syllabusId: string;
  title: string;
  description?: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyllabusUnitInput {
  title: string;
  description?: string;
  orderIndex: number;
}

// ============================================================================
// SYLLABUS TOPIC (Core content)
// ============================================================================

export interface SyllabusTopic {
  id?: string;
  syllabusId?: string;
  syllabusUnitId?: string | null;
  schoolId?: string;
  title: string;
  description?: string;
  learningObjectives: string[]; // Required
  difficulty: DifficultyLevel; // Required
  estimatedDurationMinutes?: number;
  orderIndex?: number;
  sourceGradeId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSyllabusTopicRequest {
  title: string;
  description?: string;
  orderIndex: number;
  syllabusUnitId?: string;
  learningObjectives: string[];
  difficulty: DifficultyLevel;
  estimatedDurationMinutes?: number;
  dependencies?: TopicDependencyInput[];
}

export interface UpdateSyllabusTopicRequest {
  title?: string;
  description?: string;
  learningObjectives?: string[];
  difficulty?: DifficultyLevel;
  estimatedDurationMinutes?: number;
}

// ============================================================================
// TOPIC DEPENDENCIES (Prerequisites)
// ============================================================================

export interface TopicDependency {
  id: string;
  topicId: string;
  dependsOnTopicId: string | null;
  dependsOnTopicName: string | null;
  dependsOnGradeId: string | null;
  createdAt: Date;
}

export interface TopicDependencyInput {
  dependsOnTopicId?: string;
  dependsOnTopicName?: string;
  dependsOnGradeId?: string;
}

// ============================================================================
// SYLLABUS VERSION (Audit trail)
// ============================================================================

export interface SyllabusVersion {
  id: string;
  syllabusId: string;
  version: number;
  changedBy: string | null;
  changeNote?: string;
  snapshot: Record<string, any>;
  createdAt: Date;
}

// ============================================================================
// DTOs & RESPONSES
// ============================================================================

export interface SyllabusWithDetails {
  syllabus: Syllabus;
  grade: Grade;
  subject: Subject;
  teacher: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  units: SyllabusUnit[];
  topics: SyllabusTopic[];
  dependencies: TopicDependency[];
  topicCount: number;
  publishedVersion?: SyllabusVersion;
}

export interface SyllabusListItem {
  id: string;
  title: string;
  gradeName: string;
  subjectName: string;
  status: SyllabusStatus;
  version: number;
  topicCount: number;
  teacherName: string;
  publishedAt: Date | null;
  updatedAt: Date;
}

export interface SyllabusResponse {
  success: boolean;
  data?: SyllabusWithDetails | SyllabusListItem[] | Syllabus | SyllabusTopic;
  error?: string;
  message?: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface SyllabusValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  circularDependencies: string[][];
}

export interface DependencyValidation {
  topicId: string;
  topicName: string;
  unresolvedDependencies: TopicDependencyInput[];
  hasCircular: boolean;
  missingPrerequisites: string[];
}

export interface ListSyllabiiParams {
  schoolId: string;
  gradeId?: string;
  subjectId?: string;
  status?: SyllabusStatus;
  teacherId?: string;
  limit?: number;
  offset?: number;
}

export interface ListSyllabiiResult {
  syllabi: SyllabusListItem[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// LEGACY TYPES (Backwards compatibility with existing code)
// ============================================================================

export interface SyllabusChapter {
  id?: string;
  title: string;
  description?: string;
  topics: SyllabusTopic[];
  orderIndex?: number;
}

export interface ParsedSyllabusContent {
  title: string;
  description?: string;
  chapters: SyllabusChapter[];
}

export interface TeacherSyllabus {
  id: string;
  schoolId: string;
  teacherId: string;
  title: string;
  description?: string;
  contentOriginal?: Buffer | string;
  contentParsed: ParsedSyllabusContent;
  format: 'pdf' | 'text' | 'form';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSyllabusInput {
  title: string;
  description?: string;
  content: string | Buffer;
  format: 'pdf' | 'text' | 'form';
  chapters?: Array<{
    title: string;
    description?: string;
    topics?: Array<{
      title: string;
      description?: string;
      learningObjectives: string[];
    }>;
  }>;
}

export interface UpdateSyllabusInput {
  title?: string;
  description?: string;
  contentParsed?: ParsedSyllabusContent;
}

export interface SyllabusParseResult {
  success: boolean;
  data?: ParsedSyllabusContent;
  error?: string;
}
