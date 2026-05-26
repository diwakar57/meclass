/**
 * AI Classroom Integration Types
 * Request/Response mapping and data structures for OpenMAIC integration
 */

// ==================== REQUEST TYPES ====================

/**
 * Request to generate an AI classroom session for a student
 */
export interface GenerateAIClassroomSessionRequest {
  // Student context
  studentId: string;
  schoolId: string;
  
  // Curriculum context
  topicId: string;
  
  // Session customization
  sessionDuration?: number; // minutes (5-120), default 30
  teachingStyle?: 'friendly' | 'strict' | 'storytelling' | 'socratic';
  
  // Media options
  enableVideo?: boolean; // default true
  enableAudio?: boolean; // default true
  enableInteraction?: boolean; // default true
  enableQuiz?: boolean; // default true
  
  // Optional WebSearch context
  enableWebSearch?: boolean; // default false
}

/**
 * Response after initiating session generation
 */
export interface GenerateAIClassroomSessionResponse {
  sessionId: string;
  status: 'generating' | 'generated' | 'ready';
  
  // If generating asynchronously
  pollUrl?: string;
  estimatedDuration?: number; // seconds
  
  // If generated synchronously
  session?: AIClassroomSession;
}

/**
 * Request to submit quiz answers for a session
 */
export interface SubmitQuizRequest {
  responses: QuizResponse[];
}

export interface QuizResponse {
  questionId: string;
  answer: string | string[]; // single answer or multiple choice
  timeSpent?: number; // milliseconds
}

/**
 * Response after quiz submission
 */
export interface SubmitQuizResponse {
  sessionId: string;
  quizScore: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  masteryUpdated: boolean;
  newMasteryScore?: number;
  detailedResults: QuizResultDetails[];
}

export interface QuizResultDetails {
  questionId: string;
  correct: boolean;
  feedback?: string;
  explanation?: string;
}

/**
 * Request to get chat response from agent during session
 */
export interface SessionChatRequest {
  message: string;
  sceneId?: string; // which scene/context
}

/**
 * Streamed response from agent (via SSE or WebSocket)
 */
export interface SessionChatResponse {
  type: 'agent_response' | 'action' | 'status' | 'error';
  
  // For agent_response
  text?: string;
  speaker?: string; // agent name
  
  // For action
  action?: ActionData;
  
  // For status
  status?: 'thinking' | 'speaking' | 'waiting' | 'completed';
  
  // For error
  error?: string;
}

// ==================== MAIN SESSION MODEL ====================

/**
 * Complete AI classroom session
 * Represents a generated interactive lesson with all content and metadata
 */
export interface AIClassroomSession {
  // Identity & context
  id: string; // UUID
  sessionType: 'ai_classroom_interactive';
  studentId: string;
  schoolId: string;
  topicId: string;
  
  // Customization applied
  difficultyLevel: number; // 1-10
  teachingStyle: string;
  duration: number; // seconds
  
  // Generated content URLs
  contentUrl?: string; // Full playback URL
  videoUrl?: string; // Video-only URL
  audioUrl?: string; // Audio file URL
  transcriptUrl?: string; // Text transcript URL
  
  // Embedded scene data (extracted from OpenMAIC Stage)
  sceneData: {
    totalScenes: number;
    scenes: AISceneData[];
  };
  
  // Interactive & engagement data
  interactionData: {
    quizData?: SessionQuizData;
    discussionLog?: ChatMessage[]; // For multi-agent sessions
    userResponses?: SessionResponse[]; // Student interactions
  };
  
  // Media assets referenced in session
  mediaData: {
    images: MediaReference[];
    generatedAssets: GeneratedAssetReference[];
  };
  
  // Lifecycle
  status: 'generated' | 'started' | 'completed' | 'abandoned';
  generatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date; // When session expires if not started
  
  // Metadata & extended info
  metadata: Record<string, unknown>; // Flexible storage
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Individual scene extracted from OpenMAIC output
 */
export interface AISceneData {
  id: string;
  stageId: string;
  type: 'slide' | 'quiz' | 'interactive' | 'pbl';
  title: string;
  order: number; // Display order
  description?: string;
  
  // Type-specific content
  slideContent?: SlideSceneContent;
  quizContent?: QuizSceneContent;
  interactiveContent?: InteractiveSceneContent;
  pblContent?: PBLSceneContent;
  
  // Actions to execute (teaching actions)
  actions: ActionData[];
  
  // Optional whiteboard explanations
  whiteboards?: WhiteboardData[];
  
  // Multi-agent config for this scene
  multiAgent?: {
    enabled: boolean;
    agentIds: string[];
    directorPrompt?: string;
  };
  
  // Metadata
  createdAt?: number;
  updatedAt?: number;
}

export interface SlideSceneContent {
  type: 'slide';
  title: string;
  bodyText?: string;
  elements: SlideElement[]; // PPTist elements
  layout?: string;
}

export interface SlideElement {
  id: string;
  type: string; // 'text', 'image', 'shape', etc.
  content?: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  style?: Record<string, unknown>;
}

export interface QuizSceneContent {
  type: 'quiz';
  instructions?: string;
  questions: QuizQuestionData[];
  scoring: 'auto' | 'manual';
  timeLimit?: number; // seconds
}

export interface QuizQuestionData {
  id: string;
  type: 'single' | 'multiple' | 'short_answer' | 'true_false';
  question: string;
  options?: {
    label: string;
    value: string;
  }[];
  correctAnswer?: string[] | string;
  explanation?: string;
  points?: number;
}

export interface InteractiveSceneContent {
  type: 'interactive';
  htmlUrl?: string; // URL to interactive HTML
  htmlEmbed?: string; // Embedded HTML content
  instructions?: string;
}

export interface PBLSceneContent {
  type: 'pbl';
  projectName: string;
  description: string;
  objectives: string[];
  tasks: PBLTask[];
}

export interface PBLTask {
  id: string;
  title: string;
  description: string;
  resources?: string[]; // References or URLs
}

/**
 * Action to execute during playback (teaching action)
 */
export interface ActionData {
  id: string;
  type: string; // 'speech', 'spotlight', 'wb_draw_text', etc.
  title?: string;
  description?: string;
  
  // Type-specific properties (flexible)
  [key: string]: unknown;
}

export interface WhiteboardData {
  id: string;
  title?: string;
  content: string; // Markdown or HTML
  elements: SlideElement[];
}

/**
 * Quiz data embedded in session (aggregated)
 */
export interface SessionQuizData {
  quizzes: SessionQuizModule[];
  totalQuestions: number;
  totalPoints: number;
  totalAttempts: number;
  averageScore?: number;
}

export interface SessionQuizModule {
  sceneId: string;
  sceneName: string;
  questions: QuizQuestionData[];
  completed: boolean;
  score?: number;
  maxScore?: number;
}

/**
 * Chat message in discussion log
 */
export interface ChatMessage {
  id: string;
  timestamp: number; // seconds from session start
  speaker: string; // agent name or "Student"
  text: string;
  type: 'agent' | 'student' | 'system';
}

/**
 * Student response/interaction during session
 */
export interface SessionResponse {
  id: string;
  timestamp: number;
  sceneId?: string;
  type: 'text_input' | 'quiz_answer' | 'selection' | 'verbal';
  content: string;
}

/**
 * Media reference (image, video, etc.)
 */
export interface MediaReference {
  id: string;
  type: 'image' | 'video' | 'audio';
  url?: string;
  storageKey?: string; // If stored in S3/cloud
  width?: number;
  height?: number;
  duration?: number; // For audio/video
  caption?: string;
}

/**
 * Generated asset reference (TTS audio, etc.)
 */
export interface GeneratedAssetReference {
  id: string;
  type: 'tts_audio' | 'generated_image' | 'generated_video';
  url: string;
  sceneId?: string;
  elementId?: string;
  metadata?: Record<string, unknown>;
}

// ==================== TRANSCRIPT & LOGGING ====================

/**
 * Complete transcript of a session
 */
export interface SessionTranscript {
  id: string;
  sessionId: string;
  schoolId: string;
  
  // Transcript entries
  entries: TranscriptEntry[];
  
  // Full text for search
  plainText: string;
  wordCount: number;
  
  // Metadata
  language?: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranscriptEntry {
  id: string;
  timestamp: number; // seconds from session start
  speaker: string; // agent name or "Student"
  text: string;
  type: 'narration' | 'question' | 'explanation' | 'user_response' | 'system';
  sceneId?: string;
  confidence?: number; // For ASR transcriptions
}

/**
 * Interaction log for engagement analytics
 */
export interface SessionInteractionLog {
  id: string;
  sessionId: string;
  schoolId: string;
  
  // Individual entries
  entries: InteractionLogEntry[];
  
  // Aggregated metrics
  totalInteractions: number;
  avgResponseTime?: number; // milliseconds
  questionAskedCount?: number;
  quizAttemptCount?: number;
  helpRequestCount?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface InteractionLogEntry {
  id: string;
  timestamp: number; // seconds from session start
  type: 'action_executed' | 'student_response' | 'quiz_submitted' 
       | 'scene_completed' | 'help_requested' | 'pause' | 'resume' | 'question_asked';
  sceneId?: string;
  duration?: number; // How long the interaction took
  details: Record<string, unknown>; // Flexible details
}

// ==================== VALIDATION & ERROR TYPES ====================

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Error response
 */
export interface AIClassroomErrorResponse {
  error: {
    code: string; // AIClassroomErrorCode
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Error codes for AI classroom operations
 */
export enum AIClassroomErrorCode {
  // Validation (400)
  INVALID_STUDENT_ID = 'INVALID_STUDENT_ID',
  INVALID_TOPIC_ID = 'INVALID_TOPIC_ID',
  INVALID_SESSION_DURATION = 'INVALID_SESSION_DURATION',
  INVALID_TEACHING_STYLE = 'INVALID_TEACHING_STYLE',
  
  // Authorization (403)
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  TENANT_MISMATCH = 'TENANT_MISMATCH',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // OpenMAIC errors (5xx)
  GENERATION_FAILED = 'GENERATION_FAILED',
  GENERATION_TIMEOUT = 'GENERATION_TIMEOUT',
  GENERATION_QUOTA_EXCEEDED = 'GENERATION_QUOTA_EXCEEDED',
  MEDIA_GENERATION_FAILED = 'MEDIA_GENERATION_FAILED',
  
  // Data errors (422)
  SESSION_DATA_INVALID = 'SESSION_DATA_INVALID',
  SESSION_DATA_INCOMPLETE = 'SESSION_DATA_INCOMPLETE',
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
  
  // System errors (500)
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// ==================== LIST RESPONSES ====================

/**
 * Paginated list of sessions
 */
export interface ListAIClassroomSessionsResponse {
  sessions: AIClassroomSession[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Get transcript response
 */
export interface GetTranscriptResponse {
  transcript: SessionTranscript;
  format: 'json' | 'plaintext';
}

/**
 * Get interaction log response
 */
export interface GetInteractionLogResponse {
  log: SessionInteractionLog;
  summary: {
    totalInteractions: number;
    engagementScore: number; // 0-100
    avgResponseTime: number;
    completionPercentage: number;
  };
}
