export type PlanType = 'simple' | 'core' | 'harsh';

export type ConfidenceLabel = 'low' | 'medium' | 'high';

export type MasteryLevel = 'mastered' | 'reinforce' | 'weak' | 'unknown';

export type ConfidencePattern =
  | 'aligned'
  | 'overconfident_weak'
  | 'underconfident_strong'
  | 'confidence_missing';

export type PaceRecommendation = 'slow' | 'standard' | 'fast';

export interface SyllabusTopicInput {
  topicName: string;
  subtopics?: string[];
  objectives?: string[];
  prerequisites?: string[];
  weight?: number;
  priority?: 'low' | 'medium' | 'high';
  difficultyTag?: 'low' | 'medium' | 'high';
}

export interface SyllabusModuleInput {
  moduleName: string;
  topics: SyllabusTopicInput[];
}

export interface StructuredSyllabusInput {
  id?: string;
  teacherId?: string;
  subjectName?: string;
  modules?: SyllabusModuleInput[];
}

export interface TeacherSyllabusInput {
  syllabusId?: string;
  teacherId?: string;
  sourceType?: 'text' | 'pdf' | 'structured';
  subjectNameHint?: string;
  rawText?: string;
  structured?: StructuredSyllabusInput;
}

export interface SyllabusTopic {
  id: string;
  topicName: string;
  subtopics: string[];
  objectives: string[];
  prerequisites: string[];
  weight: number;
  priority: 'low' | 'medium' | 'high';
  difficultyTag: 'low' | 'medium' | 'high';
}

export interface SyllabusModule {
  id: string;
  moduleName: string;
  topics: SyllabusTopic[];
}

export interface SyllabusModel {
  id: string;
  teacherId?: string;
  subjectName: string;
  modules: SyllabusModule[];
  sourceType: 'text' | 'pdf' | 'structured';
  versionHash: string;
}

export interface DiagnosticAnswerInput {
  questionId: string;
  mappedTopics: string[];
  correct: boolean;
  confidenceScore?: number | ConfidenceLabel;
}

export interface DiagnosticResultInput {
  studentId: string;
  syllabusId?: string;
  answers: DiagnosticAnswerInput[];
  confidenceScale?: {
    min: number;
    max: number;
  };
}

export interface TopicMasteryProfile {
  topicName: string;
  masteryScore: number;
  masteryLevel: MasteryLevel;
  confidenceAverage?: number;
  confidencePattern: ConfidencePattern;
  flags: string[];
}

export interface StudentDiagnosticProfile {
  studentId: string;
  syllabusId?: string;
  baselineScore: number;
  topicMastery: TopicMasteryProfile[];
  masteryMap: Record<string, number>;
  confidenceMap: Record<string, number>;
  strengths: string[];
  weakTopics: string[];
  unknownTopics: string[];
  overconfidentWeakAreas: string[];
  underconfidentStrongAreas: string[];
  recommendedPacing: PaceRecommendation;
}

export interface StudyPlanDefinition {
  planType: PlanType;
  hoursPerWeek: number;
  sessionsPerWeek: number;
  paceLevel: 'slow' | 'standard' | 'intensive';
  revisionFrequency: number;
  practiceIntensity: 'light' | 'medium' | 'high';
  description: string;
}

export interface GeneratedClassSession {
  classId: string;
  title: string;
  topicName: string;
  subtopicName?: string;
  objective: string;
  durationMinutes: number;
  sessionOrder: number;
  planType: PlanType;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  teachingContentSummary: string;
  practiceTasks: string[];
  revisionTasks: string[];
  masteryCheckpoint: string;
  week: number;
  tags: string[];
  prerequisites: string[];
}

export interface RoadmapCoverage {
  topicName: string;
  sessionsAllocated: number;
  masteryAtBaseline?: number;
  priority: 'low' | 'medium' | 'high';
}

export interface GeneratedClassRoadmap {
  roadmapId: string;
  studentId?: string;
  syllabusId: string;
  planType: PlanType;
  totalWeeks: number;
  totalSessions: number;
  sessions: GeneratedClassSession[];
  coverage: RoadmapCoverage[];
}

export interface AdaptiveClassGenerationInput {
  teacherSyllabus: TeacherSyllabusInput;
  studentDiagnostic?: DiagnosticResultInput;
  selectedPlanType?: PlanType;
  allowDefaultPlanWithoutDiagnostic?: boolean;
  runAiPlanningPrompt?: boolean;
}

export interface AdaptiveClassGenerationOutput {
  structuredSyllabusModel: SyllabusModel;
  studentDiagnosticProfile: StudentDiagnosticProfile | null;
  availablePlans: StudyPlanDefinition[];
  planRecommendation: PlanType;
  selectedPlan: StudyPlanDefinition;
  generatedClassRoadmap: GeneratedClassRoadmap;
  aiPlanningPrompt: {
    systemPrompt: string;
    userPrompt: string;
    expectedJsonSchema: Record<string, unknown>;
  };
  metadata: {
    generatedAt: string;
    inputFingerprint: string;
    regenerationTriggers: string[];
    savedFilePath?: string;
  };
}
