/**
 * LearnAI Integration Service
 * 
 * Core orchestrator between LearnAI platform and OpenMAIC classroom engine
 * Handles request building, output mapping, validation, and persistence
 * 
 * Key responsibilities:
 * - Fetch student context (profile, learning DNA, mastery)
 * - Build OpenMAIC generation requests with personalized context
 * - Call OpenMAIC generation engine
 * - Map OpenMAIC output to LearnAI session models
 * - Persist sessions to database
 * - Handle quiz completion and mastery updates
 * - Stream real-time interactions
 */

import { createLogger } from '@/lib/logger';
import { query, transaction } from '@/lib/db';
import { nanoid } from 'nanoid';
import type {
  GenerateAIClassroomSessionRequest,
  GenerateAIClassroomSessionResponse,
  AIClassroomSession,
  ValidationResult,
  SubmitQuizRequest,
  SubmitQuizResponse,
  ActionData,
  QuizQuestionData,
} from '@/lib/types/ai-classroom';
import type { GenerateClassroomInput, GenerateClassroomResult } from '@/lib/server/classroom-generation';
import type { StudentProfile } from '@/lib/student/student-service';
import type { TopicData } from '@/lib/curriculum/curriculum-service';
import type { LearningDNA } from '@/lib/repositories/learning-dna';

const log = createLogger('LearnAIIntegrationService');

/**
 * Enhanced student context for OpenMAIC personalization
 */
export interface StudentWithContext {
  id: string;
  profile: StudentProfile;
  learningDNA?: LearningDNA;
  currentMastery?: {
    topicId: string;
    score: number;
    attempts: number;
    masteredAt?: Date;
  };
}

/**
 * Metadata about the generation session
 */
interface SessionMetadata {
  studentId: string;
  schoolId: string;
  topicId: string;
  requestedAt: Date;
  generatedAt: Date;
  generationDurationMs: number;
  openmacId: string; // Reference to OpenMAIC stage ID
}

/**
 * LearnAIIntegrationService
 * Main integration orchestrator
 */
export class LearnAIIntegrationService {
  private static toLearningDNA(row: any): LearningDNA {
    return {
      id: String(row.id),
      studentId: String(row.student_id),
      schoolId: String(row.school_id),
      paceType: (row.pace_type || 'medium') as LearningDNA['paceType'],
      mistakeType: (row.mistake_type || 'mixed') as LearningDNA['mistakeType'],
      preferredStyle: (row.preferred_style || 'interactive') as LearningDNA['preferredStyle'],
      attentionSpanScore: Number(row.attention_span_score || 50),
      recoveryRate: Number(row.recovery_rate || 50),
      lastUpdated: new Date(row.last_updated || row.updated_at || Date.now()),
      createdAt: new Date(row.created_at || Date.now()),
    };
  }

  private static toActionData(action: unknown, fallbackId: string): ActionData {
    const actionRecord = ((action || {}) as Record<string, unknown>);
    return {
      ...actionRecord,
      id: String(actionRecord.id || fallbackId),
      type: String(actionRecord.type || 'unknown'),
    };
  }

  private static extractQuizQuestions(scene: any): QuizQuestionData[] {
    const content = scene?.content as { questions?: unknown[] } | undefined;
    const questions = Array.isArray(content?.questions) ? content.questions : [];

    return questions.map((raw: any, index: number) => {
      const questionType =
        raw?.type === 'multiple' ||
        raw?.type === 'short_answer' ||
        raw?.type === 'true_false'
          ? raw.type
          : 'single';

      const normalizedOptions = Array.isArray(raw?.options)
        ? raw.options.map((option: any) => {
            if (typeof option === 'string') {
              return { label: option, value: option };
            }
            return {
              label: String(option?.label ?? option?.value ?? 'Option'),
              value: String(option?.value ?? option?.label ?? 'option'),
            };
          })
        : undefined;

      return {
        id: String(raw?.id || `${scene?.id || 'scene'}-q-${index + 1}`),
        type: questionType,
        question: String(raw?.question || 'Question'),
        options: normalizedOptions,
        correctAnswer: raw?.answer,
        explanation: raw?.analysis ? String(raw.analysis) : undefined,
        points: Number(raw?.points || 1),
      };
    });
  }
  
  /**
   * Generate an AI classroom session for a student
   * 
   * Main entry point for the integration
   * Orchestrates: fetch context → build request → generate → map → persist
   */
  static async generateAIClassroomSession(
    request: GenerateAIClassroomSessionRequest
  ): Promise<GenerateAIClassroomSessionResponse> {
    const startTime = Date.now();
    const { studentId, schoolId, topicId } = request;
    
    log.info(`Generating AI classroom session`, { studentId, topicId, schoolId });
    
    try {
      // 1. VALIDATE REQUEST
      this.validateGenerationRequest(request);
      
      // 2. FETCH STUDENT CONTEXT
      const student = await this.fetchStudentContext(studentId, schoolId);
      if (!student) {
        throw new Error(`Student ${studentId} not found`);
      }
      
      // 3. FETCH TOPIC CONTEXT
      const topic = await this.fetchTopicContext(topicId, schoolId);
      if (!topic) {
        throw new Error(`Topic ${topicId} not found`);
      }
      
      // 4. BUILD OpenMAIC REQUEST
      const openmacRequest = this.buildOpenMAICRequest(topic, student, {
        duration: request.sessionDuration || 30,
        teachingStyle: request.teachingStyle || 'friendly',
        enableVideo: request.enableVideo !== false,
        enableAudio: request.enableAudio !== false,
        enableInteraction: request.enableInteraction !== false,
        enableQuiz: request.enableQuiz !== false,
        enableWebSearch: request.enableWebSearch || false,
      });
      
      // 5. CALL OpenMAIC GENERATION
      const openmacResult = await this.callOpenMAICGeneration(openmacRequest);
      
      // 6. MAP OUTPUT
      const metadata: SessionMetadata = {
        studentId,
        schoolId,
        topicId,
        requestedAt: new Date(),
        generatedAt: new Date(),
        generationDurationMs: Date.now() - startTime,
        openmacId: openmacResult.id,
      };
      
      const session = this.mapOpenMAICOutput(openmacResult, metadata);
      
      // 7. VALIDATE MAPPED SESSION
      const validation = this.validateSessionData(session);
      if (!validation.valid) {
        log.warn(`Session validation warnings`, { errors: validation.errors });
        if (validation.errors.length > 0) {
          throw new Error(`Session validation failed: ${validation.errors.join(', ')}`);
        }
      }
      
      // 8. PERSIST SESSION
      const persistedSession = await this.persistSession(session);
      
      log.info(`AI classroom session generated successfully`, {
        sessionId: persistedSession.id,
        durationMs: Date.now() - startTime,
      });
      
      return {
        sessionId: persistedSession.id,
        status: 'generated',
        session: persistedSession,
      };
      
    } catch (error) {
      log.error(`Failed to generate AI classroom session`, { error, request });
      
      // Return error appropriately
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw {
            code: 'NOT_FOUND',
            message: error.message,
            status: 404,
          };
        }
      }
      
      throw {
        code: 'GENERATION_FAILED',
        message: 'Failed to generate AI classroom session',
        details: error instanceof Error ? error.message : String(error),
        status: 500,
      };
    }
  }
  
  /**
   * Validate generation request
   */
  private static validateGenerationRequest(request: GenerateAIClassroomSessionRequest): void {
    const errors: string[] = [];
    
    if (!request.studentId || request.studentId.trim() === '') {
      errors.push('studentId is required');
    }
    
    if (!request.schoolId || request.schoolId.trim() === '') {
      errors.push('schoolId is required');
    }
    
    if (!request.topicId || request.topicId.trim() === '') {
      errors.push('topicId is required');
    }
    
    if (request.sessionDuration !== undefined) {
      const duration = request.sessionDuration;
      if (duration < 5 || duration > 120) {
        errors.push('sessionDuration must be between 5 and 120 minutes');
      }
    }
    
    if (request.teachingStyle) {
      const validStyles = ['friendly', 'strict', 'storytelling', 'socratic'];
      if (!validStyles.includes(request.teachingStyle)) {
        errors.push(`teachingStyle must be one of: ${validStyles.join(', ')}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join('; ')}`);
    }
  }
  
  /**
   * Fetch student context from database
   */
  private static async fetchStudentContext(
    studentId: string,
    schoolId: string
  ): Promise<StudentWithContext | null> {
    try {
      // Fetch basic student profile
      const accountResult = await query(
        `SELECT u.id, u.email, sp.* FROM users u
         LEFT JOIN student_profiles sp ON u.id = sp.user_id
         WHERE u.id = $1 AND u.school_id = $2`,
        [studentId, schoolId]
      );
      
      if (!accountResult.rows[0]) {
        return null;
      }
      
      const row = accountResult.rows[0];
      
      // Fetch learning DNA
      const dnaResult = await query(
        `SELECT * FROM learning_dna WHERE student_id = $1 AND school_id = $2`,
        [studentId, schoolId]
      );
      
      const learningDNA = dnaResult.rows[0]
        ? this.toLearningDNA(dnaResult.rows[0])
        : undefined;
      
      return {
        id: studentId,
        profile: {
          id: row.id,
          userId: row.user_id,
          schoolId: row.school_id,
          gradeLevel: row.grade_level,
          interests: row.interests || [],
          strengths: row.strengths || [],
          weakAreas: row.weak_areas || [],
          learningStyle: row.learning_style,
          languagePreference: row.language_preference || 'en-US',
          onboardingCompleted: row.onboarding_completed,
          diagnosticScore: row.diagnostic_score,
          preferredAiTeacherPersona: row.preferred_ai_teacher_persona || 'friendly',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
        learningDNA,
      };
      
    } catch (error) {
      log.error('Failed to fetch student context', { error, studentId, schoolId });
      throw error;
    }
  }
  
  /**
   * Fetch topic context from database
   */
  private static async fetchTopicContext(
    topicId: string,
    schoolId: string
  ): Promise<TopicData | null> {
    try {
      const result = await query(
        `SELECT t.* FROM topics t
         INNER JOIN curriculum c ON t.curriculum_id = c.id
         WHERE t.id = $1 AND c.school_id = $2`,
        [topicId, schoolId]
      );
      
      if (!result.rows[0]) {
        return null;
      }
      
      const row = result.rows[0];
      
      return {
        id: row.id,
        curriculumId: row.curriculum_id,
        name: row.name || row.title,
        title: row.title,
        description: row.description,
        gradeLevel: row.grade_level,
        objectives: row.objectives || row.learning_objectives || [],
        learningObjectives: row.learning_objectives || row.objectives || [],
        concepts: row.concepts || row.prerequisites || [],
        prerequisites: row.prerequisites || [],
        duration: row.duration_minutes,
        difficulty: row.difficulty_level,
        difficultyLevel: row.difficulty_level,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as any;
      
    } catch (error) {
      log.error('Failed to fetch topic context', { error, topicId, schoolId });
      throw error;
    }
  }
  
  /**
   * Build OpenMAIC generation request with LearnAI context
   */
  private static buildOpenMAICRequest(
    topic: TopicData,
    student: StudentWithContext,
    options: {
      duration: number;
      teachingStyle: string;
      enableVideo: boolean;
      enableAudio: boolean;
      enableInteraction: boolean;
      enableQuiz: boolean;
      enableWebSearch: boolean;
    }
  ): GenerateClassroomInput {
    const topicAny = topic as any;
    const topicName = topicAny.name || topicAny.title || 'Topic';
    const topicObjectives = topicAny.objectives || topicAny.learningObjectives || [];
    const topicConcepts = topicAny.concepts || topicAny.prerequisites || [];
    const topicDifficulty = topicAny.difficulty ?? topicAny.difficultyLevel;
    const pace = (student.learningDNA as any)?.pace_type || (student.learningDNA as any)?.paceType || 'moderate';
    const mistakeType =
      (student.learningDNA as any)?.mistake_type ||
      (student.learningDNA as any)?.mistakeType ||
      'mixed';
    
    // Build student context string
    const studentContextParts = [
      `Student Grade: ${student.profile.gradeLevel || 'Unknown'}`,
      `Learning Style: ${student.profile.learningStyle || 'Unknown'}`,
      student.profile.interests?.length ? `Student Interests: ${student.profile.interests.join(', ')}` : null,
      `Language: ${student.profile.languagePreference}`,
    ].filter(Boolean);
    
    // Add learning DNA if available
    if (student.learningDNA) {
      studentContextParts.push(`Learning Pace: ${pace}`);
      studentContextParts.push(`Mistake Pattern: ${mistakeType}`);
    }
    
    // Build topic context
    const topicContextParts = [
      `Topic: ${topicName}`,
      topic.description ? `Description: ${topic.description}` : null,
      topicObjectives?.length ? `Objectives: ${topicObjectives.join('; ')}` : null,
      topicConcepts?.length ? `Key Concepts: ${topicConcepts.join(', ')}` : null,
      topicDifficulty ? `Difficulty Level: ${topicDifficulty}/10` : null,
    ].filter(Boolean);
    
    // Build full requirement string
    const systemPrompt = [
      'You are generating an interactive classroom session.',
      '',
      'STUDENT CONTEXT:',
      ...studentContextParts,
      '',
      'TOPIC CONTEXT:',
      ...topicContextParts,
      '',
      'SESSION REQUIREMENTS:',
      `- Duration: ${options.duration} minutes`,
      `- Teaching Style: ${options.teachingStyle}`,
      `- Include video: ${options.enableVideo}`,
      `- Include audio narration: ${options.enableAudio}`,
      `- Include interactive elements: ${options.enableInteraction}`,
      `- Include quiz: ${options.enableQuiz}`,
      '',
      'Create an engaging, personalized interactive lesson that)',
      'addresses the student\'s learning style and current mastery level.',
    ].join('\n');
    
    return {
      requirement: systemPrompt,
      language: student.profile.languagePreference as 'zh-CN' | 'en-US',
      enableWebSearch: options.enableWebSearch,
      enableImageGeneration: true,
      enableVideoGeneration: options.enableVideo,
      enableTTS: options.enableAudio,
    };
  }
  
  /**
   * Call OpenMAIC generation engine
   */
  private static async callOpenMAICGeneration(
    request: GenerateClassroomInput
  ): Promise<GenerateClassroomResult> {
    try {
      // Import at call time to avoid circular dependencies
      const { generateClassroom } = await import('@/lib/server/classroom-generation');
      
      log.info('Calling OpenMAIC generation', { requirementLength: request.requirement.length });
      
      const result = await generateClassroom(request, {
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      });
      
      log.info('OpenMAIC generation completed', { stageId: result.id, scenesCount: result.scenesCount });
      
      return result;
      
    } catch (error) {
      log.error('OpenMAIC generation failed', { error });
      throw new Error(`OpenMAIC generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Map OpenMAIC output to LearnAI session model
   */
  private static mapOpenMAICOutput(
    result: GenerateClassroomResult,
    metadata: SessionMetadata
  ): AIClassroomSession {
    
    // Extract scenes data
    const sceneData = {
      totalScenes: result.scenesCount,
      scenes: (result.scenes || []).map((scene, index) => {
        const actions: ActionData[] = (scene.actions || []).map((action: unknown, actionIndex: number) =>
          this.toActionData(action, `${scene.id}-action-${actionIndex + 1}`)
        );

        return {
          id: scene.id,
          stageId: scene.stageId,
          type: scene.type,
          title: scene.title,
          order: index,
          description: scene.title,
          actions,
          multiAgent: scene.multiAgent,
        };
      }),
    };
    
    // Extract quiz data if present
    const quizScenes = (result.scenes || []).filter((scene) => scene.type === 'quiz');
    const quizModules = quizScenes.map((scene) => {
      const questions = this.extractQuizQuestions(scene);
      return {
        sceneId: scene.id,
        sceneName: scene.title || 'Quiz',
        questions,
        completed: false,
      };
    });
    const quizData =
      quizModules.length > 0
        ? {
            quizzes: quizModules,
            totalQuestions: quizModules.reduce((sum, module) => sum + module.questions.length, 0),
            totalPoints: quizModules.reduce(
              (sum, module) =>
                sum +
                module.questions.reduce(
                  (questionSum, question) => questionSum + Number(question.points || 1),
                  0
                ),
              0
            ),
            totalAttempts: 0,
          }
        : undefined;
    
    return {
      id: nanoid(),
      sessionType: 'ai_classroom_interactive',
      studentId: metadata.studentId,
      schoolId: metadata.schoolId,
      topicId: metadata.topicId,
      
      difficultyLevel: 5, // Default, can be adjusted based on generation
      teachingStyle: 'friendly',
      duration: result.scenes?.length ? result.scenes.length * 300 : 1800, // Estimate: ~5min per scene
      
      contentUrl: result.url,
      sceneData,
      interactionData: {
        quizData,
        discussionLog: [],
        userResponses: [],
      },
      mediaData: {
        images: [],
        generatedAssets: [],
      },
      
      status: 'generated',
      generatedAt: metadata.generatedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      metadata: {
        openmacId: metadata.openmacId,
        generationDurationMs: metadata.generationDurationMs,
      },
    };
  }
  
  /**
   * Validate session data integrity
   */
  private static validateSessionData(session: AIClassroomSession): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields
    if (!session.id) errors.push('Session must have an id');
    if (!session.studentId) errors.push('Session must have a studentId');
    if (!session.schoolId) errors.push('Session must have a schoolId');
    if (!session.topicId) errors.push('Session must have a topicId');
    if (session.duration <= 0) errors.push('Duration must be greater than 0');
    if (!session.sceneData?.scenes?.length) warnings.push('Session has no scenes');
    
    // URL validation if present
    if (session.contentUrl && !this.isValidUrl(session.contentUrl)) {
      warnings.push('contentUrl is not a valid URL');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  /**
   * Simple URL validation
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Persist session to database
   */
  private static async persistSession(session: AIClassroomSession): Promise<AIClassroomSession> {
    try {
      const result = await query(
        `INSERT INTO ai_classroom_sessions (
          id, session_type, school_id, student_id, topic_id,
          difficulty_level, teaching_style, duration_seconds,
          content_url, video_url, audio_url, transcript_url,
          scene_data, interaction_data, media_data,
          status, generated_at, created_at, updated_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          session.id,
          session.sessionType,
          session.schoolId,
          session.studentId,
          session.topicId,
          session.difficultyLevel,
          session.teachingStyle,
          session.duration,
          session.contentUrl || null,
          session.videoUrl || null,
          session.audioUrl || null,
          session.transcriptUrl || null,
          JSON.stringify(session.sceneData),
          JSON.stringify(session.interactionData),
          JSON.stringify(session.mediaData),
          session.status,
          session.generatedAt.toISOString(),
          session.createdAt.toISOString(),
          session.updatedAt.toISOString(),
          JSON.stringify(session.metadata),
        ]
      );
      
      if (!result.rows[0]) {
        throw new Error('Failed to insert session into database');
      }

      const transcriptEntries = (session.sceneData?.scenes || []).map((scene: any, idx: number) => ({
        id: `scene-${idx + 1}`,
        timestamp: idx * 90,
        speaker: 'AI',
        text: scene.title || scene.description || `Scene ${idx + 1}`,
        type: 'narration',
        sceneId: scene.id,
      }));
      const plainText = transcriptEntries.map((entry: any) => entry.text).join('\n');
      const wordCount = plainText.length > 0 ? plainText.trim().split(/\s+/).length : 0;

      await query(
        `INSERT INTO session_transcripts
         (session_id, school_id, entries, plain_text, word_count, language, generated_at, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (session_id) DO UPDATE
         SET entries = EXCLUDED.entries,
             plain_text = EXCLUDED.plain_text,
             word_count = EXCLUDED.word_count,
             language = EXCLUDED.language,
             updated_at = CURRENT_TIMESTAMP`,
        [
          session.id,
          session.schoolId,
          JSON.stringify(transcriptEntries),
          plainText,
          wordCount,
          session.metadata?.language || 'en-US',
        ]
      );

      await query(
        `INSERT INTO session_interaction_logs
         (session_id, school_id, entries, total_interactions, created_at, updated_at)
         VALUES ($1, $2, '[]'::jsonb, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (session_id) DO NOTHING`,
        [session.id, session.schoolId]
      );
      
      return session; // Return original object, DB just verified insert
      
    } catch (error) {
      log.error('Failed to persist session', { error, sessionId: session.id });
      throw error;
    }
  }
  
  /**
   * Get session by ID
   */
  static async getSession(sessionId: string, schoolId: string): Promise<AIClassroomSession | null> {
    try {
      const result = await query(
        `SELECT * FROM ai_classroom_sessions 
         WHERE id = $1 AND school_id = $2`,
        [sessionId, schoolId]
      );
      
      if (!result.rows[0]) {
        return null;
      }
      
      return this.rowToSession(result.rows[0]);
      
    } catch (error) {
      log.error('Failed to get session', { error, sessionId, schoolId });
      throw error;
    }
  }
  
  /**
   * List sessions for a student
   */
  static async listStudentSessions(
    studentId: string,
    schoolId: string,
    limit = 50,
    offset = 0
  ): Promise<{ sessions: AIClassroomSession[]; total: number }> {
    try {
      const totalResult = await query(
        `SELECT COUNT(*) as count FROM ai_classroom_sessions 
         WHERE student_id = $1 AND school_id = $2`,
        [studentId, schoolId]
      );
      
      const sessionsResult = await query(
        `SELECT * FROM ai_classroom_sessions 
         WHERE student_id = $1 AND school_id = $2
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [studentId, schoolId, limit, offset]
      );
      
      return {
        sessions: sessionsResult.rows.map(row => this.rowToSession(row)),
        total: Number(totalResult.rows[0]?.count || 0),
      };
      
    } catch (error) {
      log.error('Failed to list sessions', { error, studentId, schoolId });
      throw error;
    }
  }
  
  /**
   * Handle quiz submission and mastery update
   */
  static async handleQuizSubmission(
    sessionId: string,
    schoolId: string,
    quizRequest: SubmitQuizRequest
  ): Promise<SubmitQuizResponse> {
    try {
      const session = await this.getSession(sessionId, schoolId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      // Score quiz responses
      const quizData = session.interactionData?.quizData;
      if (!quizData) {
        throw new Error('Session has no quiz data');
      }
      
      let totalScore = 0;
      let maxScore = 0;
      const results = [];
      
      for (const response of quizRequest.responses) {
        const question = this.findQuestion(quizData, response.questionId);
        if (!question) continue;
        
        const points = question.points || 1;
        maxScore += points;
        
        const isCorrect = this.checkAnswer(response.answer, question.correctAnswer);
        if (isCorrect) {
          totalScore += points;
        }
        
        results.push({
          questionId: response.questionId,
          correct: isCorrect,
          feedback: isCorrect ? 'Correct!' : 'Not quite right.',
          explanation: question.explanation,
        });
      }
      
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      
      // Update mastery if topic has mastery tracking
      // This would integrate with TopicMastery service
      
      return {
        sessionId,
        quizScore: totalScore,
        maxScore,
        percentage,
        feedback: `You scored ${totalScore}/${maxScore}`,
        masteryUpdated: true,
        newMasteryScore: percentage,
        detailedResults: results,
      };
      
    } catch (error) {
      log.error('Failed to handle quiz submission', { error, sessionId });
      throw error;
    }
  }
  
  /**
   * Utility: find question in quiz data
   */
  private static findQuestion(quizData: any, questionId: string) {
    for (const quiz of quizData.quizzes || []) {
      const q = quiz.questions?.find((q: any) => q.id === questionId);
      if (q) return q;
    }
    return null;
  }
  
  /**
   * Utility: check if answer is correct
   */
  private static checkAnswer(userAnswer: string | string[], correctAnswer?: string[] | string): boolean {
    if (!correctAnswer) return false;
    
    const normalize = (a: string | string[]) => 
      Array.isArray(a) ? a.sort() : [a];
    
    const userArray = normalize(userAnswer);
    const correctArray = normalize(correctAnswer);
    
    return JSON.stringify(userArray) === JSON.stringify(correctArray);
  }
  
  /**
   * Map database row to AIClassroomSession
   */
  private static rowToSession(row: any): AIClassroomSession {
    return {
      id: row.id,
      sessionType: row.session_type,
      studentId: row.student_id,
      schoolId: row.school_id,
      topicId: row.topic_id,
      difficultyLevel: row.difficulty_level,
      teachingStyle: row.teaching_style,
      duration: row.duration_seconds,
      contentUrl: row.content_url,
      videoUrl: row.video_url,
      audioUrl: row.audio_url,
      transcriptUrl: row.transcript_url,
      sceneData: typeof row.scene_data === 'string' ? JSON.parse(row.scene_data) : row.scene_data,
      interactionData: typeof row.interaction_data === 'string' ? JSON.parse(row.interaction_data) : row.interaction_data,
      mediaData: typeof row.media_data === 'string' ? JSON.parse(row.media_data) : row.media_data,
      status: row.status,
      generatedAt: new Date(row.generated_at),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default LearnAIIntegrationService;
