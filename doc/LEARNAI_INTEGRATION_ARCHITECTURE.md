# LearnAI-OpenMAIC Integration Architecture

**Version**: 1.0  
**Status**: Implementation Ready  
**Date**: March 23, 2026  
**Purpose**: Complete integration guide for connecting LearnAI platform with OpenMAIC classroom engine

---

## 📋 Table of Contents

1. [Integration Overview](#integration-overview)
2. [Architecture Design](#architecture-design)
3. [Service Design](#service-design)
4. [Request/Response Mapping](#requestresponse-mapping)
5. [Data Models](#data-models)
6. [API Endpoints](#api-endpoints)
7. [File Changes & Structure](#file-changes--structure)
8. [Validation & Error Handling](#validation--error-handling)
9. [Implementation Checklist](#implementation-checklist)

---

## Integration Overview

### Purpose
Integrate OpenMAIC (powerful lesson generation and multi-agent orchestration engine) as the classroom backend for LearnAI SaaS platform, while maintaining loose coupling and allowing LearnAI to present OpenMAIC capabilities through its own interface.

### Key Principles

1. **Loose Coupling**: OpenMAIC remains a wrapped external service; LearnAI doesn't depend on its internals
2. **Abstraction Layer**: `LearnAIIntegrationService` handles all OpenMAIC communication
3. **Data Mapping**: OpenMAIC outputs (Stage, Scenes, Actions) map to LearnAI session models
4. **Product Exposure**: Interactive sessions exposed as "AI Teacher Classroom Experience" in LearnAI
5. **Backward Compatibility**: Existing LearnAI APIs remain unchanged; integration is additive

### Integration Scope

**OpenMAIC Reused**:
- Lesson generation engine (outline generation)
- Scene content generation
- Action generation system
- Multi-agent orchestration (LangGraph)
- Media generation pipeline (TTS, images, video)
- Quiz engine

**OpenMAIC NOT Reused**:
- Database schema
- Authentication (LearnAI handles multi-tenant auth)
- UI/Components (LearnAI has own dashboards)
- Billing/Analytics (LearnAI SaaS layer)

---

## Architecture Design

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     LearnAI Application                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        LearnAI API Controllers / Routes                  │  │
│  │  /api/lessons/generate                                  │  │
│  │  /api/sessions/{id}                                     │  │
│  │  /api/sessions/{id}/submit-quiz                         │  │
│  │  /api/sessions/{id}/transcript                          │  │
│  └────────────┬─────────────────────────────────────────────┘  │
│               │                                                 │
│  ┌────────────▼─────────────────────────────────────────────┐  │
│  │    LearnAI Service Layer                                │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  StudentService  | CurriculumService                    │  │
│  │  LearningDNAService | ProgressService                  │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │ LearnAIIntegrationService (NEW)                 │   │  │
│  │  │  ├─ buildGenerationRequest()                    │   │  │
│  │  │  ├─ generateAIClassroomSession()                │   │  │
│  │  │  ├─ mapSessionOutput()                          │   │  │
│  │  │  ├─ validateSessionData()                       │   │  │
│  │  │  └─ handleSessionCompletion()                   │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └────────────┬─────────────────────────────────────────────┘  │
│               │                                                 │
│  ┌────────────▼─────────────────────────────────────────────┐  │
│  │    LearnAI Data Access Layer (Repositories)            │  │
│  │  AIClassroomSessionRepository                          │  │
│  │  InteractionLogRepository                             │  │
│  │  SessionTranscriptRepository                          │  │
│  └────────────┬─────────────────────────────────────────────┘  │
│               │                                                 │
│  ┌────────────▼─────────────────────────────────────────────┐  │
│  │    LearnAI Data Models                                 │  │
│  │  AIClassroomSession                                   │  │
│  │  SessionInteractionLog                                │  │
│  │  SessionTranscript                                    │  │
│  │  SessionMediaData                                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP/REST
                               │ (or local function calls)
┌──────────────────────────────▼──────────────────────────────────┐
│                      OpenMAIC Classroom Engine                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                 │
│  classroomGeneration.ts                                         │
│  ├─ generateClassroom() - Main generation engine               │
│  ├─ Outline generation (LLM prompts)                            │
│  ├─ Scene content generation                                   │
│  └─ Action generation                                          │
│                                                                 │
│  Multi-Agent Orchestration                                     │
│  ├─ Agent Registry                                             │
│  ├─ Director Node (LangGraph)                                  │
│  └─ Agent Execution Engine                                     │
│                                                                 │
│  Media Generation                                              │
│  ├─ TTS Pipeline (OpenAI, Azure, etc.)                         │
│  ├─ Image Generation                                           │
│  └─ Video Generation                                           │
│                                                                 │
│  Output: Stage + Scenes + Actions                              │
│                                                                 │
└──────────────────────────────────────────────────────────────────┘
```

### Integration Boundaries

**What OpenMAIC Owns**:
- Lesson generation algorithm
- LLM prompt engineering
- Action/scene generation
- Media generation
- Multi-agent orchestration

**What LearnAI Owns**:
- Request preprocessing (student context, curriculum mapping)
- Student authentication & authorization
- School-level tenant isolation
- Database persistence
- Progress tracking & mastery updates
- Quiz grading & analytics
- UI/UX
- Billing & SaaS features

**Integration Layer (LearnAIIntegrationService)**:
- Request building
- Output mapping
- Validation
- Error handling
- Fallback logic

---

## Service Design

### LearnAIIntegrationService: Core Integration Service

**File**: `lib/services/learnai-integration-service.ts`

**Purpose**: Bridge between LearnAI platform logic and OpenMAIC classroom engine.

#### Key Responsibilities

```typescript
/**
 * LearnAIIntegrationService
 * 
 * Orchestrates interaction between LearnAI (platform) and OpenMAIC (classroom engine).
 * Handles request building, output mapping, validation, and persistence.
 */
export class LearnAIIntegrationService {
  
  /**
   * Generate an AI classroom session for a student
   * 
   * Flow:
   * 1. Validate student & topic
   * 2. Fetch student context (profile, learning DNA, mastery)
   * 3. Fetch topic details
   * 4. Build OpenMAIC generation request
   * 5. Call OpenMAIC classroom generation
   * 6. Map output to LearnAI session model
   * 7. Persist session and metadata
   * 8. Return LearnAI session
   */
  async generateAIClassroomSession(
    request: GenerateAIClassroomSessionRequest
  ): Promise<GenerateAIClassroomSessionResponse>

  /**
   * Build a request for OpenMAIC generation
   * Injects LearnAI context (student profile, learning DNA, etc.)
   */
  private buildOpenMAICRequest(
    topic: TopicData,
    student: StudentWithContext,
    options: SessionGenerationOptions
  ): GenerateClassroomInput

  /**
   * Map OpenMAIC output to LearnAI session model
   * Handles type conversion and data extraction
   */
  private mapOpenMAICOutput(
    openmaidResult: GenerateClassroomResult,
    metadata: SessionMetadata
  ): AIClassroomSession

  /**
   * Validate session data from OpenMAIC
   * Ensures all required fields present and valid
   */
  private validateSessionData(session: AIClassroomSession): ValidationResult

  /**
   * Handle session completion
   * Updates mastery, logs interaction, triggers notifications
   */
  async handleSessionCompletion(
    sessionId: string,
    quizResult?: QuizAttemptData
  ): Promise<void>

  /**
   * Stream session playback with real-time interaction
   * Manages chat, actions, and responses
   */
  async streamSessionChat(
    sessionId: string,
    userMessage: string,
    onProgress: (chunk: SessionStreamChunk) => void
  ): Promise<void>

  /**
   * Get session transcript
   * Compiles voice, chat, and system messages
   */
  async getSessionTranscript(
    sessionId: string
  ): Promise<SessionTranscript>

  /**
   * Retrieve interaction log
   */
  async getInteractionLog(
    sessionId: string
  ): Promise<InteractionLogEntry[]>
}
```

#### Key Methods Detailed

**1. generateAIClassroomSession()**

Orchestrates the entire generation pipeline:

```
Input:
├─ studentId: string
├─ topicId: string
├─ schoolId: string
├─ options?: {
│    duration?: number
│    teachingStyle?: string
│    enableVideo?: boolean
│    enableAudio?: boolean
│    enableInteraction?: boolean
│  }

Process:
1. Fetch StudentProfile + StudentWithContext
2. Fetch Topic + Curriculum context
3. Fetch current TopicMastery
4. Fetch LearningDNA (learning style, pace, preferences)
5. buildOpenMAICRequest() → GenerateClassroomInput
6. callOpenMAICClassroomGeneration() → GenerateClassroomResult
7. mapOpenMAICOutput() → AIClassroomSession
8. validateSessionData() → check completeness
9. persistAIClassroomSession() → save to DB
10. Return session with playback URL

Output:
├─ sessionId: string
├─ playbackUrl: string
├─ duration: number
├─ contentUrl?: string
├─ mediaUrls:
│  ├─ videoUrl?: string
│  ├─ audioUrl?: string
│  └─ transcriptUrl?: string
├─ status: 'generated' | 'ready'
└─ expiresAt?: Date
```

**2. buildOpenMAICRequest()**

Injects LearnAI context into OpenMAIC request:

```typescript
Input:
- topic: TopicData
- student: StudentWithContext
  ├─ profile: StudentProfile (grade, learningStyle, interests)
  ├─ dna: LearningDNA (pace, mistakeType, preferredStyle)
  ├─ mastery: TopicMastery[] (current scores)
  └─ diagnosticScore: number

Output to OpenMAIC:
{
  requirement: "Generate interactive classroom session on {Topic}",
  enableWebSearch: false,
  enableImageGeneration: true,
  enableVideoGeneration: options.enableVideo,
  enableTTS: options.enableAudio,
  language: student.profile.languagePreference,
  
  // Injected context (as markdown prefix in requirement)
  systemContext: {
    studentGrade: "Grade 5",
    studentLearningStyle: "visual learner",
    studentInterests: ["math", "sports"],
    studentPacing: "moderate",
    studentMistakeType: "conceptual",
    currentMastery: "45% (struggling)",
    difficultyAdjustment: "simplified"
  }
}
```

**3. mapOpenMAICOutput()**

Converts OpenMAIC's Stage → LearnAI's AIClassroomSession:

```typescript
OpenMAIC Output:
{
  id: string (stage ID)
  url: string (playback URL)
  stage: Stage
  scenes: Scene[]
  scenesCount: number
}

Mapped to LearnAI:
{
  id: string (UUID)
  sessionType: 'ai_classroom_interactive'
  studentId: string
  topicId: string
  difficultyLevel: number
  teachingStyle: string
  videoUrl?: string (extracted from scenes)
  audioUrl?: string (extracted from TTS)
  transcript?: string (compiled from speech actions)
  duration: number
  sceneData: {
    totalScenes: number
    scenes: AISceneData[]
  }
  interactionData: {
    quizData?: SessionQuizData
    discussionLog?: DirectorMessage[]
  }
  mediaData: {
    images: MediaReference[]
    generatedAssets: GeneratedAssetReference[]
  }
  status: 'generated'
  createdAt: Date
}
```

**4. validateSessionData()**

Ensures data integrity:

```
Checks:
✓ Session has required fields (id, studentId, topicId, status)
✓ Scenes are properly formed
✓ Media URLs are valid (if present)
✓ Transcript length > 0 (if present)
✓ Quiz data valid (if present)
✓ Interaction log well-formed
✓ Duration > 0
✓ No circular references in complex objects

Returns: ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
```

**5. handleSessionCompletion()**

Post-session processing:

```
When session ends (student takes quiz):

1. Receive quiz results
2. Grade quiz (LLM-assisted if needed)
3. Update TopicMastery
4. Update LearningDNA (if params changed)
5. Add InteractionLog entry
6. Trigger notifications
7. Update LearningPlan (next topic recommendation)
```

---

## Request/Response Mapping

### Request Flow: LearnAI → OpenMAIC

#### Input: LearnAI Request

```typescript
interface GenerateAIClassroomSessionRequest {
  // Student context
  studentId: string;
  schoolId: string;
  
  // Curriculum context
  topicId: string;
  
  // Session options
  sessionDuration?: number;           // minutes
  teachingStyle?: 'friendly' | 'strict' | 'storytelling' | 'socratic';
  enableVideo?: boolean;
  enableAudio?: boolean;
  enableInteraction?: boolean;
  enableQuiz?: boolean;
}
```

#### Processing Steps

```
1. VALIDATE & AUTHORIZE
   ├─ Verify student exists
   ├─ Verify school owns student (tenant isolation)
   ├─ Verify student has access to topic
   └─ Check rate limits

2. FETCH CONTEXT
   ├─ Student Profile (grade, interests, learning style)
   ├─ Student Learning DNA (pace, mistakes, preferences)
   ├─ Current Topic Mastery
   ├─ Learning Plan
   └─ Curriculum path

3. BUILD ENRICHED REQUEST
   ├─ Student context string:
   │  "Grade 5 student, visual learner, interested in art and music,
   │   currently has 45% mastery of this topic,
   │   learns at moderate pace, struggles with conceptual understanding"
   │
   ├─ Topic context:
   │  "Topic: Algebraic Equations (Grade 5)
   │   Objectives: [obj1, obj2, obj3]
   │   Prerequisites: [prereq1, prereq2]
   │   Related topics: [rel1, rel2]"
   │
   └─ Session parameters:
      "Duration: 30 minutes
       Teaching style: friendly
       Include: video, audio, interactive quiz"

4. CALL OpenMAIC
   └─ classroomGeneration.generateClassroom(request)

5. HANDLE RESPONSE
   ├─ Check success
   ├─ Extract Stage + Scenes
   ├─ Map to LearnAI models
   └─ Persist to DB
```

#### Output: OpenMAIC Classroom Result

```typescript
interface GenerateClassroomResult {
  id: string;                // stage ID (UUID)
  url: string;               // playback URL
  stage: Stage;              // Complete stage with metadata
  scenes: Scene[];           // Array of scenes (slide, quiz, interactive, pbl)
  scenesCount: number;       // Total scenes generated
  createdAt: string;         // ISO timestamp
}

// Stage structure
interface Stage {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  language?: string;         // 'zh-CN', 'en-US'
  style?: string;            // Teaching style applied
  whiteboard?: Whiteboard[]; // Optional whiteboard data
}

// Scene structure
interface Scene {
  id: string;
  stageId: string;
  type: 'slide' | 'quiz' | 'interactive' | 'pbl';
  title: string;
  order: number;
  
  content: SceneContent;     // Type-specific (slide/quiz/interactive/pbl)
  actions?: Action[];        // Teacher actions (speech, drawing, spotlight)
  whiteboards?: Slide[];     // Detailed explanations
  
  multiAgent?: {
    enabled: boolean;
    agentIds: string[];
    directorPrompt?: string;
  };
  
  createdAt?: number;
  updatedAt?: number;
}

// Action examples
interface Action {
  id: string;
  type: 'speech' | 'spotlight' | 'laser' | 'wb_draw_text' | 'play_video' | ...;
  // Type-specific properties...
}
```

### Response Mapping: OpenMAIC → LearnAI

#### Mapped Output: LearnAI AIClassroomSession

```typescript
interface AIClassroomSession {
  // Identity
  id: string;                           // LearnAI UUID
  sessionType: 'ai_classroom_interactive';
  
  // Context
  studentId: string;
  schoolId: string;
  topicId: string;
  difficultyLevel: number;              // 1-10
  teachingStyle: string;                // style applied
  
  // Media URLs
  contentUrl?: string;                  // Full stage playback URL
  videoUrl?: string;                    // If video extracted
  audioUrl?: string;                    // If audio generated
  transcriptUrl?: string;               // If transcript generated
  
  // Session data embedded
  duration: number;                     // seconds
  sceneData: {
    totalScenes: number;
    scenes: AISceneData[];              // Extracted from OpenMAIC
  };
  
  // Interaction data
  interactionData: {
    quizData?: SessionQuizData;
    discussionLog?: ChatMessage[];      // If multi-agent enabled
    userResponses?: SessionResponse[];
  };
  
  // Media assets
  mediaData: {
    images: MediaReference[];           // In-scene images
    generatedAssets: GeneratedAssetReference[];
  };
  
  // Metadata & timestamps
  status: 'generated' | 'completed' | 'abandoned';
  generatedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface AISceneData {
  id: string;
  type: 'slide' | 'quiz' | 'interactive' | 'pbl';
  title: string;
  order: number;
  
  // Extracted content (simplified)
  slideContent?: {
    title: string;
    bodyText: string;
    elements: SlideElement[];
  };
  
  quizContent?: {
    questions: QuizQuestion[];
    scoring: 'auto' | 'manual';
  };
  
  // Actions to execute
  actions: ActionData[];
}

interface SessionQuizData {
  scenes: QuizSceneData[];
  totalQuestions: number;
  totalPoints: number;
}

interface QuizSceneData {
  sceneId: string;
  questions: {
    id: string;
    type: 'single' | 'multiple' | 'short_answer';
    question: string;
    options?: string[];
    correctAnswer?: string[];
  }[];
}

interface SessionTranscript {
  sessionId: string;
  content: TranscriptEntry[];
  plainText: string;
  wordCount: number;
}

interface TranscriptEntry {
  timestamp: number;    // seconds
  speaker: string;      // agent name or "student"
  text: string;
  type: 'narration' | 'question' | 'explanation' | 'user_response';
}

interface InteractionLogEntry {
  timestamp: number;
  type: 'action_executed' | 'student_response' | 'quiz_submitted' | 'scene_completed';
  details: Record<string, unknown>;
}
```

---

## Data Models

### New Models to Create

#### 1. AIClassroomSession Model

```typescript
/**
 * Represents a complete AI classroom interactive session
 * Stores both metadata and playback data
 */
export interface AIClassroomSession {
  // Primary key & identifiers
  id: string;                    // UUID
  sessionType: 'ai_classroom_interactive';
  
  // Multi-tenant & user context
  schoolId: string;              // Tenant isolation
  studentId: string;
  topicId: string;
  
  // Content & customization
  difficultyLevel: number;       // 1-10
  teachingStyle: string;
  duration: number;              // seconds
  
  // URLs to generated content
  contentUrl?: string;           // Full playback URL
  videoUrl?: string;
  audioUrl?: string;
  transcriptUrl?: string;
  
  // Embedded scene data
  sceneData: {
    totalScenes: number;
    scenes: AISceneData[];
  };
  
  // Interaction & engagement
  interactionData: {
    quizData?: SessionQuizData;
    discussionLog?: ChatMessage[];
    userResponses?: SessionResponse[];
  };
  
  // Media assets
  mediaData: {
    images: MediaReference[];
    generatedAssets: GeneratedAssetReference[];
  };
  
  // Status & lifecycle
  status: 'generated' | 'started' | 'completed' | 'abandoned';
  generatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Metadata for tracking
  metadata: Record<string, unknown>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. SessionTranscript Model

```typescript
/**
 * Complete transcript of a session
 * Includes narration, Q&A, explanations
 */
export interface SessionTranscript {
  id: string;
  sessionId: string;
  schoolId: string;
  
  // Transcript content
  entries: TranscriptEntry[];    // Ordered by timestamp
  plainText: string;             // Full text for search
  wordCount: number;
  
  // Metadata
  language?: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranscriptEntry {
  id: string;
  timestamp: number;             // seconds from session start
  speaker: string;               // agent name or "Student"
  text: string;
  type: 'narration' | 'question' | 'explanation' | 'user_response';
  sceneId?: string;
}
```

#### 3. SessionInteractionLog Model

```typescript
/**
 * Detailed log of student interactions during session
 * Used for engagement analytics
 */
export interface SessionInteractionLog {
  id: string;
  sessionId: string;
  schoolId: string;
  
  entries: InteractionLogEntry[];
  totalInteractions: number;
  
  // Engagement metrics
  avgResponseTime?: number;      // milliseconds
  quizAttempts?: number;
  helpRequests?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface InteractionLogEntry {
  id: string;
  timestamp: number;             // seconds from session start
  type: 'action_executed' | 'student_response' | 'quiz_submitted' 
       | 'scene_completed' | 'help_requested' | 'pause' | 'resume';
  sceneId?: string;
  details: Record<string, unknown>;
}
```

#### 4. SessionQuizData Model

Embedded in AIClassroomSession for quiz tracking:

```typescript
/**
 * Quiz data from session (embedded in AIClassroomSession)
 */
export interface SessionQuizData {
  quizzes: SessionQuiz[];
  totalQuestions: number;
  totalPoints: number;
  totalAttempts: number;
}

export interface SessionQuiz {
  sceneId: string;
  questions: {
    id: string;
    type: 'single' | 'multiple' | 'short_answer';
    questionText: string;
    options?: QuizOption[];
    correctAnswer?: string[];
    explanation?: string;
    points?: number;
  }[];
}
```

### Modified Existing Models

#### TopicMastery (Enhanced)

Add support for AI classroom sessions:

```typescript
interface TopicMastery {
  // ... existing fields ...
  
  // NEW: Track sessions
  lastAISessionId?: string;
  lastAISessionScore?: number;
  aiSessionCount?: number;      // How many interactive sessions
}
```

#### StudentProfile (Enhanced)

Add preferences for AI classroom:

```typescript
interface StudentProfile {
  // ... existing fields ...
  
  // NEW: AI teacher preferences
  preferredAITeachingStyle?: 'friendly' | 'strict' | 'storytelling' | 'socratic';
  aiSessionPreferences?: {
    enableVideo?: boolean;
    enableAudio?: boolean;
    enableInteraction?: boolean;
    enableQuiz?: boolean;
  };
}
```

### Database Schema

#### ai_classroom_sessions Table

```sql
CREATE TABLE ai_classroom_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type VARCHAR(50) DEFAULT 'ai_classroom_interactive',
  
  -- Multi-tenant & context
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  topic_id UUID NOT NULL,
  
  -- Customization
  difficulty_level INTEGER DEFAULT 5,
  teaching_style VARCHAR(50),
  duration_seconds INTEGER,
  
  -- Generated content URLs
  content_url VARCHAR(512),
  video_url VARCHAR(512),
  audio_url VARCHAR(512),
  transcript_url VARCHAR(512),
  
  -- Embedded data (JSONB for flexibility)
  scene_data JSONB,
  interaction_data JSONB,
  media_data JSONB,
  
  -- Status & lifecycle
  status VARCHAR(30) DEFAULT 'generated',
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  INDEX idx_school_student (school_id, student_id),
  INDEX idx_topic_status (topic_id, status),
  INDEX idx_created_at (created_at)
);

CREATE TABLE session_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  school_id UUID NOT NULL,
  
  -- Transcript entries (JSONB for flexibility)
  entries JSONB NOT NULL,
  plain_text TEXT,
  word_count INTEGER,
  
  language VARCHAR(10),
  generated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES ai_classroom_sessions(id),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  INDEX idx_session_id (session_id)
);

CREATE TABLE session_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  school_id UUID NOT NULL,
  
  -- Log entries (JSONB)
  entries JSONB NOT NULL,
  total_interactions INTEGER,
  
  -- Metrics
  avg_response_time_ms INTEGER,
  quiz_attempts INTEGER,
  help_requests INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES ai_classroom_sessions(id),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  INDEX idx_session_id (session_id)
);
```

---

## API Endpoints

### Session Management Endpoints

```
POST /api/ai-classroom/sessions/generate
  │
  ├─ Authentication: Required (JWT)
  ├─ Authorization: Student/Teacher (view own students)
  ├─ Tenant Isolation: Automatic (school_id from auth)
  │
  ├─ Request:
  │  {
  │    studentId: string;
  │    topicId: string;
  │    sessionDuration?: number;
  │    teachingStyle?: string;
  │    enableVideo?: boolean;
  │    enableAudio?: boolean;
  │    enableInteraction?: boolean;
  │    enableQuiz?: boolean;
  │  }
  │
  └─ Response (202 Accepted for long-running):
     {
       sessionId: string;
       status: 'generating';
       estimatedDuration?: number;
       pollUrl?: string;
     }

---

GET /api/ai-classroom/sessions/{sessionId}
  │
  ├─ Authentication: Required
  ├─ Authorization: Owner or teacher
  ├─ Tenant Isolation: Verify school_id
  │
  └─ Response (200 OK):
     {
       id: string;
       sessionType: 'ai_classroom_interactive';
       studentId: string;
       topicId: string;
       status: 'generated' | 'started' | 'completed';
       contentUrl?: string;
       videoUrl?: string;
       audioUrl?: string;
       duration: number;
       sceneData: {...};
       interactionData: {...};
       mediaData: {...};
       generatedAt: string;
     }

---

GET /api/ai-classroom/sessions/{sessionId}/transcript
  │
  ├─ Authentication: Required
  ├─ Authorization: Owner or teacher
  │
  ├─ Query Parameters:
  │  - format?: 'json' | 'plaintext' | 'pdf'
  │  - include?: 'full' | 'summary'
  │
  └─ Response:
     {
       entries: [
         {
           timestamp: number;
           speaker: string;
           text: string;
           type: string;
         }
       ];
       plainText?: string;
       wordCount: number;
     }

---

GET /api/ai-classroom/sessions/{sessionId}/interaction-log
  │
  ├─ Authentication: Required
  ├─ Authorization: Owner or teacher
  │
  └─ Response:
     {
       entries: [
         {
           timestamp: number;
           type: string;
           details: {...};
         }
       ];
       totalInteractions: number;
       metrics: {...};
     }

---

POST /api/ai-classroom/sessions/{sessionId}/submit-quiz
  │
  ├─ Authentication: Required
  ├─ Request:
  │  {
  │    responses: [
  │      {
  │        questionId: string;
  │        answer: string | string[];
  │      }
  │    ];
  │  }
  │
  └─ Response:
     {
       sessionId: string;
       score: number;
       maxScore: number;
       percentage: number;
       feedback: string;
       masteryUpdated: true;
       newMasteryScore: number;
     }

---

POST /api/ai-classroom/sessions/{sessionId}/chat
  │
  ├─ Authentication: Required
  ├─ Method: POST with streaming response
  │
  ├─ Request:
  │  {
  │    message: string;
  │    sceneId?: string;
  │  }
  │
  └─ Response: SSE Stream
     event: agent_response
     data: { text: string; speaker: string; }
     
     event: action
     data: { type: string; details: {...}; }

---

GET /api/ai-classroom/sessions
  │
  ├─ Authentication: Required
  ├─ Query Parameters:
  │  - studentId?: string (default: current user)
  │  - topicId?: string
  │  - status?: 'generated' | 'completed'
  │  - limit?: number (default: 50)
  │  - offset?: number (default: 0)
  │
  └─ Response:
     {
       sessions: AIClassroomSession[];
       total: number;
       limit: number;
       offset: number;
     }
```

---

## File Changes & Structure

### New Files to Create

```
lib/
├─ services/
│  └─ learnai-integration-service.ts (Core integration service)
│
├─ repositories/
│  ├─ ai-classroom-session-repository.ts
│  ├─ session-transcript-repository.ts
│  └─ session-interaction-log-repository.ts
│
├─ models/
│  ├─ ai-classroom-session.ts (Types & interfaces)
│  ├─ session-transcript.ts
│  └─ session-interaction-log.ts
│
├─ types/
│  └─ ai-classroom.ts (Request/response types)
│
└─ integrations/
   └─ openmaic/
      ├─ client.ts (OpenMAIC HTTP client or wrapper)
      ├─ request-builder.ts (Build OpenMAIC requests)
      └─ response-mapper.ts (Map OpenMAIC outputs)

app/
└─ api/
   └─ ai-classroom/
      ├─ sessions/
      │  ├─ route.ts (List & create)
      │  ├─ [id]/
      │  │  ├─ route.ts (Get single)
      │  │  ├─ transcript/route.ts (Get transcript)
      │  │  ├─ interaction-log/route.ts (Get interaction log)
      │  │  ├─ submit-quiz/route.ts (Submit quiz)
      │  │  └─ chat/route.ts (Stream chat)
      │  └─ generate/route.ts (Generate new session)
      │
      └─ health/route.ts (Integration health check)

db/
└─ migrations/
   └─ 2026-03-23-ai-classroom-tables.sql (Create tables)
```

### Modified Files

```
db/schema.sql
├─ Add ai_classroom_sessions table
├─ Add session_transcripts table
├─ Add session_interaction_logs table
└─ Add indexes

lib/types/models.ts
├─ Add AIClassroomSession interface
├─ Add SessionTranscript interface
├─ Add SessionInteractionLog interface
└─ Export all types

lib/models/entity-models.ts
├─ Add AI classroom models if using centralized model file
└─ Ensure compatibility with existing patterns

lib/services/
├─ diagonal-test-service.ts (Optional: reference pattern)
└─ learning-dna-service.ts (Use for context enrichment)

package.json
├─ Verify TypeScript dependencies
└─ Add any new deps for OpenMAIC integration if needed

Environment variables:
├─ OPENMAIC_SERVICE_URL (if using HTTP)
├─ OPENMAIC_API_KEY (if required)
└─ AI_CLASSROOM_ENABLE_FEATURES
```

---

## Validation & Error Handling

### Request Validation

```typescript
// Validate GenerateAIClassroomSessionRequest

✓ studentId: required, valid UUID, exists in DB
✓ topicId: required, valid UUID, exists in DB
✓ schoolId: from auth context, student belongs to school
✓ sessionDuration: optional, if provided must be 5-120 minutes
✓ teachingStyle: optional, must be from enum
✓ Boolean flags: optional, defaults to true

Error Responses:
├─ 400: Bad Request (validation failure)
├─ 401: Unauthorized (missing auth)
├─ 403: Forbidden (not owner/teacher)
├─ 404: Not Found (student/topic doesn't exist)
└─ 429: Too Many Requests (rate limit)
```

### Session Data Validation

```typescript
// Validate AIClassroomSession (from OpenMAIC)

Essential Fields:
✓ id: non-empty UUID
✓ sessionType: exactly 'ai_classroom_interactive'
✓ studentId, schoolId, topicId: valid UUIDs
✓ duration: > 0
✓ status: valid enum

Scene Data:
✓ scenes: array, non-empty
✓ each scene: has id, type, title, content

Media URLs (if present):
✓ Validate URL format
✓ Check reachability (optional health check)
✓ Verify file exists

Transcript (if present):
✓ Non-empty
✓ Valid structure
✓ All entries have required fields

Error Handling:
├─ Invalid field → log warning, provide defaults
├─ Missing required field → throw error, reject session
├─ Malformed URL → log and skip media field
└─ Empty transcript → generate if possible, else skip
```

### Error Recovery Fallbacks

```
If OpenMAIC Generation Fails:
├─ Retry once with same request
├─ Retry with simplified request (fewer features)
├─ Return cached session from same topic (if available)
└─ Return error to client with retry URL

If Media Generation Fails:
├─ Generate text-only session
├─ Skip TTS, keep transcript
├─ Skip video, keep slides
└─ Log metrics for monitoring

If Validation Fails:
├─ Partial save (save what's valid)
├─ Log validation errors
├─ Return 202 with partial data
└─ Flag for manual review
```

### Error Codes & Messages

```typescript
enum AIClassroomErrorCode {
  // Validation errors (400)
  INVALID_STUDENT_ID = 'INVALID_STUDENT_ID',
  INVALID_TOPIC_ID = 'INVALID_TOPIC_ID',
  INVALID_SESSION_DURATION = 'INVALID_SESSION_DURATION',
  INVALID_TEACHING_STYLE = 'INVALID_TEACHING_STYLE',
  
  // Authorization errors (403)
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

// Example error response
{
  error: {
    code: 'GENERATION_FAILED',
    message: 'Failed to generate classroom session',
    details: {
      reason: 'OpenMAIC service timeout',
      retryable: true
    },
    timestamp: '2026-03-23T...',
    requestId: 'req_xxx'
  }
}
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)

- [ ] Create `lib/models/ai-classroom-session.ts` (types & interfaces)
- [ ] Create `lib/types/ai-classroom.ts` (request/response types)
- [ ] Create database migration for three new tables
- [ ] Run migration and verify schema
- [ ] Create `lib/repositories/ai-classroom-session-repository.ts`

### Phase 2: Service Layer (Week 1-2)

- [ ] Create `lib/integrations/openmaic/request-builder.ts`
- [ ] Create `lib/integrations/openmaic/response-mapper.ts`
- [ ] Create `lib/services/learnai-integration-service.ts` (core)
- [ ] Write unit tests for integration service
- [ ] Create `lib/repositories/session-transcript-repository.ts`
- [ ] Create `lib/repositories/session-interaction-log-repository.ts`

### Phase 3: API Endpoints (Week 2)

- [ ] GET `/api/ai-classroom/sessions/{id}` — Fetch session
- [ ] POST `/api/ai-classroom/sessions/generate` — Create session
- [ ] GET `/api/ai-classroom/sessions` — List sessions
- [ ] GET `/api/ai-classroom/sessions/{id}/transcript` — Get transcript
- [ ] GET `/api/ai-classroom/sessions/{id}/interaction-log` — Get logs

### Phase 4: Quiz & Completion (Week 2-3)

- [ ] POST `/api/ai-classroom/sessions/{id}/submit-quiz` — Submit quiz
- [ ] Integrate quiz grading
- [ ] Update topic mastery on quiz completion
- [ ] Update learning DNA

### Phase 5: Real-time Interaction (Week 3)

- [ ] POST `/api/ai-classroom/sessions/{id}/chat` — Stream responses
- [ ] Implement SSE streaming
- [ ] Handle multi-agent chat
- [ ] Log interactions

### Phase 6: Integration & Testing (Week 3-4)

- [ ] End-to-end testing
- [ ] Error handling verification
- [ ] Performance testing
- [ ] Documentation
- [ ] Deployment

---

## Success Criteria

✅ **Architecture**:
- [ ] Integration is loosely coupled
- [ ] OpenMAIC can be upgraded independently
- [ ] Request/response mapping is bidirectional

✅ **Data Models**:
- [ ] All required fields present
- [ ] JSONB fields used for flexibility
- [ ] Indexes optimized for queries
- [ ] Tenant isolation enforced

✅ **Service**:
- [ ] Generates sessions successfully
- [ ] Maps outputs correctly
- [ ] Validates data integrity
- [ ] Handles errors gracefully

✅ **APIs**:
- [ ] All endpoints working
- [ ] Authentication/authorization enforced
- [ ] Proper HTTP status codes
- [ ] Clear error messages

✅ **Testing**:
- [ ] Unit tests (70%+ coverage)
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Performance acceptable

---

## References

- [ARCHITECTURE.md](ARCHITECTURE.md) — Platform architecture
- [ARCHITECTURE_REFERENCE.md](ARCHITECTURE_REFERENCE.md) — Layered architecture patterns
- [learnai-integration-service.ts](lib/services/learnai-integration-service.ts) — Core service (to be created)
- [OpenMAIC Generation](lib/server/classroom-generation.ts) — OpenMAIC engine
