/**
 * LearnAI Integration Service
 * 
 * Bridge between LearnAI platform and OpenMAIC classroom engine
 * Responsible for:
 * - Sending lesson generation requests to OpenMAIC
 * - Receiving and mapping session outputs
 * - Storing session data for student tracking
 * - Managing teaching style and personalization context
 */

import { createLogger } from '@/lib/logger';
import { callLLM } from '@/lib/ai/llm';
import { query } from '@/lib/db';
import { nanoid } from 'nanoid';
import type { StudentProfile } from '@/lib/student/student-service';
import type { TopicData } from '@/lib/curriculum/curriculum-service';

const log = createLogger('LearnAIIntegrationService');

/**
 * Student context for OpenMAIC personalization
 */
export interface LearnAIStudentContext {
  studentId: string;
  profile: StudentProfile;
  currentMasteryScore?: number;
  learningDNA?: {
    paceType: string; // slow, moderate, fast
    mistakeType: string; // conceptual, careless, mixed
    preferredStyle: string; // friendly, strict, storytelling
    attentionSpanScore: number; // 0-100
  };
  confidenceLevel?: number; // 0-100
}

/**
 * AI classroom session request
 */
export interface AIClassroomSessionRequest {
  topic: TopicData;
  studentContext: LearnAIStudentContext;
  difficultyLevel: number; // 1-10
  teachingStyle?: string;
  sessionDuration?: number; // minutes
}

/**
 * AI classroom session response (stored after generation)
 */
export interface AIClassroomSession {
  id: string;
  studentId: string;
  topicId: string;
  schoolId: string;
  title: string;
  description?: string;
  teachingStyle: string;
  difficultyLevel: number;
  contentUrl?: string; // URL to generated stage/video
  videoUrl?: string;
  audioUrl?: string;
  transcript?: string;
  duration: number; // seconds
  interactionData?: any;
  generatedAt: Date;
  createdAt: Date;
}

/**
 * Generate an AI classroom session for a student on a specific topic
 */
export async function generateAIClassroomSession(
  request: AIClassroomSessionRequest
): Promise<{ success: boolean; session?: AIClassroomSession; error?: string }> {
  try {
    const sessionId = nanoid();
    const { topic, studentContext, difficultyLevel, teachingStyle = 'friendly' } = request;

    log.info(`Generating AI classroom session for student ${studentContext.studentId} on topic ${topic.id}`);

    // Build prompt for AI classroom generation
    const prompt = buildAIClassroomPrompt(topic, studentContext, difficultyLevel, teachingStyle);

    // Call LLM to generate lesson outline
    // In production, call actual AI classroom REST API
    const result = await callLLM(
      {
        model: 'default',
        system: AICLASSROOM_SYSTEM_PROMPT(studentContext.profile.gradeLevel),
        prompt,
        maxTokens: 2000,
        temperature: 0.7,
      },
      'ai-classroom-generation'
    );

    if (!result.text) {
      throw new Error('Failed to generate session content');
    }

    // Parse response (in real implementation, would receive structured AI classroom output)
    const sessionData = parseAIClassroomResponse(result.text);

    // Store session in database
    const session = await createAIClassroomSession(
      sessionId,
      studentContext.studentId,
      topic.id,
      studentContext.profile.schoolId!,
      sessionData,
      difficultyLevel,
      teachingStyle
    );

    log.info(`AI classroom session created: ${session.id}`);

    return { success: true, session };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('AI classroom session generation failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Create AI classroom session record in database
 */
async function createAIClassroomSession(
  id: string,
  studentId: string,
  topicId: string,
  schoolId: string,
  sessionData: any,
  difficultyLevel: number,
  teachingStyle: string
): Promise<AIClassroomSession> {
  const now = new Date();

  const result = await query(
    `INSERT INTO ai_classroom_sessions
     (id, student_id, topic_id, school_id, title, description, teaching_style, difficulty_level,
      video_url, audio_url, transcript, duration, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id, student_id, topic_id, school_id, title, description, teaching_style,
               difficulty_level, video_url, audio_url, transcript, duration, created_at, updated_at`,
    [
      id,
      studentId,
      topicId,
      schoolId,
      sessionData.title || 'Interactive Lesson',
      sessionData.description,
      teachingStyle,
      difficultyLevel,
      sessionData.videoUrl,
      sessionData.audioUrl,
      sessionData.transcript,
      sessionData.duration || 1800, // default 30 minutes
      now,
      now,
    ]
  );

  if (!result.rows[0]) {
    throw new Error('Failed to store session');
  }

  const row = result.rows[0];
  return {
    id: row.id,
    studentId: row.student_id,
    topicId: row.topic_id,
    schoolId: row.school_id,
    title: row.title,
    description: row.description,
    teachingStyle: row.teaching_style,
    difficultyLevel: row.difficulty_level,
    videoUrl: row.video_url,
    audioUrl: row.audio_url,
    transcript: row.transcript,
    duration: row.duration,
    generatedAt: now,
    createdAt: row.created_at,
  };
}

/**
 * Build comprehensive prompt for AI classroom
 */
function buildAIClassroomPrompt(
  topic: TopicData,
  studentContext: LearnAIStudentContext,
  difficultyLevel: number,
  teachingStyle: string
): string {
  const dna = studentContext.learningDNA;
  const profile = studentContext.profile;

  return `You are LearnAI, an AI educational platform. Generate an engaging, interactive lesson for a student.

TOPIC: ${topic.title}
LEARNING OBJECTIVES: ${topic.learningObjectives.join('; ')}
DESCRIPTION: ${topic.description || 'No additional description'}

STUDENT CONTEXT:
- Name: Student
- Grade Level: ${profile.gradeLevel}
- Learning Style: ${profile.learningStyle || 'not specified'}
- Interests: ${profile.interests.join(', ') || 'general'}
- Current Mastery: ${studentContext.currentMasteryScore || 'not assessed'}%
- Confidence: ${studentContext.confidenceLevel || 'not assessed'}%

LEARNING DNA:
- Pace: ${dna?.paceType || 'moderate'} (adjusts speed of lesson)
- Mistake Type: ${dna?.mistakeType || 'mixed'} (impacts explanation depth)
- Preferred Teaching Style: ${teachingStyle}
- Attention Span: ${dna?.attentionSpanScore || 50}/100

SESSION PARAMETERS:
- Difficulty Level: ${difficultyLevel}/10
- Duration: ~30 minutes
- Format: Interactive with video, audio narration, visualizations, and Q&A

REQUIREMENTS:
1. Create an engaging, conversational lesson in the voice of a friendly AI teacher
2. Include:
   - Hook/motivation (why this matters)
   - Core concept explanation (with examples)
   - Interactive elements (questions, activities)
   - Real-world application
   - Summary and next steps

3. Adapt to learning style:
   - Visual: Use descriptions of diagrams and visualizations
   - Auditory: Include narration cues and rhythm
   - Kinesthetic: Suggest interactive activities and practice
   - Reading: Provide detailed text explanations

4. Respect attention span: ${dna?.attentionSpanScore! > 70 ? 'Can go deeper into complexity' : 'Keep segments short, add pauses'}

5. Match difficulty ${difficultyLevel}/10 - adjust complexity and pacing accordingly

GENERATE: A structured lesson outline that the AI classroom engine can transform into an interactive classroom experience with video, audio, and interaction.

Return clear, actionable content that includes:
- Main teaching points
- Interactive moments
- Visual descriptions
- Audio/narration cues
- Student activities`;
}

/**
 * Parse AI classroom response
 */
function parseAIClassroomResponse(text: string): any {
  // Simple parsing - in production would handle structured OpenMAIC output
  return {
    title: 'Interactive Lesson',
    description: text.substring(0, 200),
    duration: 1800,
  };
}

/**
 * System prompt for LearnAI integrated lessons
 */
function AICLASSROOM_SYSTEM_PROMPT(gradeLevel?: string): string {
  const levelGuide =
    gradeLevel === 'college'
      ? 'College/University level - use academic language, deep concepts'
      : gradeLevel?.match(/^(9|10|11|12)$/)
      ? 'High School - use clear language, real-world examples, build toward mastery'
      : gradeLevel && parseInt(gradeLevel) <= 8
      ? 'Middle School - use simple language, plenty of examples, encourage questions'
      : gradeLevel && parseInt(gradeLevel) <= 5
      ? 'Elementary - use very simple language, lots of visuals, make it fun'
      : 'Adjust to student level';

  return `You are LearnAI's intelligent lesson designer. Your role is to create personalized, engaging educational experiences.

Your teaching approach:
- Adapt to student's learning style (visual, auditory, kinesthetic, reading/writing)
- Respect attention span and pace preferences
- Make complex topics accessible
- Use clear examples and analogies
- Encourage active learning
- Build confidence while stretching abilities

Grade Level: ${levelGuide}

Always:
1. Start with student motivation (why this matters)
2. Explain clearly with examples
3. Check understanding with interactive elements
4. Provide practice opportunities
5. Connect to real-world applications
6. End with clear takeaways

Your goal: Create a lesson that feels like a great private tutor session with the best teacher the student has ever had.`;
}

/**
 * Get stored AI classroom session
 */
export async function getAIClassroomSession(sessionId: string): Promise<AIClassroomSession | null> {
  try {
    const result = await query(
      `SELECT id, student_id, topic_id, school_id, title, description, teaching_style,
              difficulty_level, video_url, audio_url, transcript, duration, created_at, updated_at
       FROM ai_classroom_sessions WHERE id = $1`,
      [sessionId]
    );

    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      studentId: row.student_id,
      topicId: row.topic_id,
      schoolId: row.school_id,
      title: row.title,
      description: row.description,
      teachingStyle: row.teaching_style,
      difficultyLevel: row.difficulty_level,
      videoUrl: row.video_url,
      audioUrl: row.audio_url,
      transcript: row.transcript,
      duration: row.duration,
      generatedAt: row.created_at,
      createdAt: row.created_at,
    };
  } catch (error) {
    log.error('Error fetching session:', error);
    return null;
  }
}

/**
 * List student's AI classroom sessions
 */
export async function listStudentSessions(
  studentId: string,
  limit = 20,
  offset = 0
): Promise<AIClassroomSession[]> {
  try {
    const result = await query(
      `SELECT id, student_id, topic_id, school_id, title, description, teaching_style,
              difficulty_level, video_url, audio_url, transcript, duration, created_at, updated_at
       FROM ai_classroom_sessions
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [studentId, limit, offset]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      topicId: row.topic_id,
      schoolId: row.school_id,
      title: row.title,
      description: row.description,
      teachingStyle: row.teaching_style,
      difficultyLevel: row.difficulty_level,
      videoUrl: row.video_url,
      audioUrl: row.audio_url,
      transcript: row.transcript,
      duration: row.duration,
      generatedAt: row.created_at,
      createdAt: row.created_at,
    }));
  } catch (error) {
    log.error('Error listing sessions:', error);
    throw error;
  }
}
