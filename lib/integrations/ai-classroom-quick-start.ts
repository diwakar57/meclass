/**
 * LearnAI-OpenMAIC Integration: Quick Start Implementation Guide
 * 
 * This file contains practical examples and templates for integrating
 * the AI classroom system into your application.
 */

// ============================================================================
// 1. BASIC USAGE: Generate a Session
// ============================================================================

/**
 * Example: Generate an AI classroom session for a student
 * 
 * Copy this pattern into your API route or server action
 */
export async function exampleGenerateSession() {
  const LearnAIIntegrationService = require('@/lib/services/learnai-integration-service').default;
  
  try {
    const response = await LearnAIIntegrationService.generateAIClassroomSession({
      studentId: 'student-123',
      schoolId: 'school-456',
      topicId: 'topic-789',
      sessionDuration: 30, // minutes
      teachingStyle: 'friendly',
      enableVideo: true,
      enableAudio: true,
      enableInteraction: true,
      enableQuiz: true,
    });

    console.log('Session generated:', response.sessionId);
    return response;
  } catch (error) {
    console.error('Generation failed:', error);
    throw error;
  }
}

// ============================================================================
// 2. FETCH & DISPLAY SESSION
// ============================================================================

/**
 * Example: Fetch a session for playback
 */
export async function exampleGetSession(sessionId: string, schoolId: string) {
  const LearnAIIntegrationService = require('@/lib/services/learnai-integration-service').default;
  
  const session = await LearnAIIntegrationService.getSession(sessionId, schoolId);
  
  if (!session) {
    throw new Error('Session not found');
  }

  // Now you can:
  // 1. Render scenes: session.sceneData.scenes
  // 2. Extract quiz: session.interactionData.quizData
  // 3. Play video: session.videoUrl
  // 4. Play audio: session.audioUrl
  // 5. Show transcript: fetch from /api/ai-classroom/sessions/{id}/transcript

  return session;
}

// ============================================================================
// 3. HANDLE QUIZ SUBMISSION
// ============================================================================

/**
 * Example: Submit quiz answers and update mastery
 */
export async function exampleSubmitQuiz(
  sessionId: string,
  schoolId: string,
  responses: Array<{ questionId: string; answer: string | string[] }>
) {
  const LearnAIIntegrationService = require('@/lib/services/learnai-integration-service').default;

  // Grade the quiz
  const result = await LearnAIIntegrationService.handleQuizSubmission(
    sessionId,
    schoolId,
    { responses }
  );

  console.log(`Score: ${result.quizScore}/${result.maxScore} (${result.percentage}%)`);

  // Now integrate with your mastery system:
  // - Update TopicMastery table
  // - Update LearningDNA if needed
  // - Recommend next topic
  // - Send notifications

  return result;
}

// ============================================================================
// 4. TRACK INTERACTIONS
// ============================================================================

/**
 * Example: Log student interactions during session playback
 */
export async function exampleLogInteraction(
  sessionId: string,
  schoolId: string
) {
  const InteractionLogRepo = require('@/lib/repositories/session-interaction-log-repository').default;

  // First time: create log (this happens during generation)
  // Already done by LearnAIIntegrationService

  // During playback: add interactions
  await InteractionLogRepo.addInteractionEntry(sessionId, schoolId, {
    id: 'log-entry-1',
    timestamp: 15, // seconds into session
    type: 'student_response',
    sceneId: 'scene-1',
    duration: 4500, // milliseconds
    details: { responseText: 'Correct!' },
  });

  // Later: calculate engagement score
  const engagementScore = await InteractionLogRepo.calculateEngagementScore(
    sessionId,
    schoolId
  );
  console.log(`Engagement: ${engagementScore}%`);
}

// ============================================================================
// 5. RETRIEVE TRANSCRIPT
// ============================================================================

/**
 * Example: Get complete transcript with search
 */
export async function exampleGetTranscript(
  sessionId: string,
  schoolId: string
) {
  const TranscriptRepo = require('@/lib/repositories/session-transcript-repository').default;

  // Get full transcript
  const transcript = await TranscriptRepo.getTranscript(sessionId, schoolId);

  // Get statistics
  const stats = await TranscriptRepo.getTranscriptStats(sessionId, schoolId);
  console.log(`Transcript: ${stats?.wordCount} words, ${stats?.entryCount} entries`);

  // Search for keyword
  const relevantEntries = await TranscriptRepo.searchTranscript(
    sessionId,
    schoolId,
    'photosynthesis'
  );

  console.log(`Found ${relevantEntries.length} mentions of 'photosynthesis'`);

  return { transcript, stats, relevantEntries };
}

// ============================================================================
// 6. ERROR HANDLING PATTERN
// ============================================================================

/**
 * Example: Proper error handling with recovery
 */
export async function exampleErrorHandling(
  studentId: string,
  topicId: string,
  schoolId: string
) {
  const LearnAIIntegrationService = require('@/lib/services/learnai-integration-service').default;
  const ErrorHandler = require('@/lib/integrations/ai-classroom-errors').default;

  try {
    // Validate inputs before calling service
    if (!ErrorHandler.validateStudentId(studentId)) {
      throw ErrorHandler.ErrorResponses.invalidStudentId();
    }
    if (!ErrorHandler.validateTopicId(topicId)) {
      throw ErrorHandler.ErrorResponses.invalidTopicId();
    }

    // Attempt generation with retry logic
    let attempt = 0;
    let lastError = null;

    while (attempt < 3) {
      try {
        return await LearnAIIntegrationService.generateAIClassroomSession({
          studentId,
          topicId,
          schoolId,
        });
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt < 3) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError;
  } catch (error) {
    // Log error with context
    if (error instanceof ErrorHandler.AIClassroomError) {
      ErrorHandler.logAIClassroomError(error, { studentId, topicId });

      // Return user-friendly message
      const userMsg = ErrorHandler.getUserFriendlyMessage(error);
      console.error(userMsg);

      throw {
        code: error.code,
        message: userMsg,
        statusCode: ErrorHandler.getStatusCodeForError(error),
      };
    }

    throw error;
  }
}

// ============================================================================
// 7. NEXT.JS API ROUTE PATTERN
// ============================================================================

/**
 * Example: Next.js API route handler
 * 
 * Usage: PUT this in app/api/ai-classroom/sessions/custom/route.ts
 */
export async function exampleAPIHandler(req: any) {
  const { method } = req;

  if (method === 'POST') {
    try {
      const { studentId, topicId, schoolId } = await req.json();

      // Validate
      const errors = [];
      if (!studentId) errors.push('studentId required');
      if (!topicId) errors.push('topicId required');
      if (!schoolId) errors.push('schoolId required');

      if (errors.length > 0) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: errors,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Generate session
      const LearnAIIntegrationService = require('@/lib/services/learnai-integration-service').default;
      const response = await LearnAIIntegrationService.generateAIClassroomSession({
        studentId,
        topicId,
        schoolId,
      });

      return new Response(JSON.stringify(response), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to generate session',
          details: error instanceof Error ? error.message : String(error),
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response('Method not allowed', { status: 405 });
}

// ============================================================================
// 8. LIST SESSIONS FOR DASHBOARD
// ============================================================================

/**
 * Example: Fetch sessions for a student dashboard
 */
export async function exampleDashboardSessions(
  studentId: string,
  schoolId: string,
  limit = 20,
  offset = 0
) {
  const LearnAIIntegrationService = require('@/lib/services/learnai-integration-service').default;

  const { sessions, total } = await LearnAIIntegrationService.listStudentSessions(
    studentId,
    schoolId,
    limit,
    offset
  );

  // Format for UI
  return {
    sessions: sessions.map(session => ({
      id: session.id,
      topic: session.topicId, // You'd fetch topic name separately
      status: session.status,
      duration: Math.round(session.duration / 60), // Convert to minutes
      generatedAt: session.generatedAt,
      videoAvailable: !!session.videoUrl,
      quizAvailable: !!session.interactionData?.quizData,
    })),
    total,
    hasMore: offset + limit < total,
  };
}

// ============================================================================
// 9. ANALYTICS & REPORTING
// ============================================================================

/**
 * Example: Build student analytics from sessions
 */
export async function exampleAnalytics(studentId: string, schoolId: string) {
  const SessionRepo = require('@/lib/repositories/ai-classroom-session-repository').default;
  const InteractionLogRepo = require('@/lib/repositories/session-interaction-log-repository').default;

  // Get all sessions for this student
  const { sessions } = await SessionRepo.listStudentSessions(studentId, schoolId, 1000, 0);

  // Aggregate metrics
  const analytics = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.status === 'completed').length,
    averageDuration: Math.round(
      sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
    ),
    difficultyDistribution: {} as Record<number, number>,
    engagementScores: [] as number[],
  };

  // Get difficulty distribution
  const difficulties = await SessionRepo.getSessionsByDifficulty(schoolId, studentId);
  analytics.difficultyDistribution = difficulties;

  // Get engagement scores for completed sessions
  for (const session of sessions.filter(s => s.status === 'completed')) {
    const score = await InteractionLogRepo.calculateEngagementScore(session.id, schoolId);
    analytics.engagementScores.push(score);
  }

  return analytics;
}

// ============================================================================
// 10. INTEGRATION WITH EXISTING SERVICES
// ============================================================================

/**
 * Example: Update TopicMastery after quiz completion
 * 
 * This shows how to integrate with your existing mastery tracking system
 */
export async function exampleUpdateMastery(
  studentId: string,
  schoolId: string,
  topicId: string,
  quizScore: number,
  maxScore: number
) {
  // 1. Calculate percentage
  const percentage = (quizScore / maxScore) * 100;

  // 2. Get current mastery (if exists)
  // const currentMastery = await getMasteryScore(studentId, topicId, schoolId);

  // 3. Update mastery (pseudo-code, use your actual DB)
  // const newMastery = {
  //   studentId,
  //   schoolId,
  //   topicId,
  //   score: percentage,
  //   attempts: (currentMastery?.attempts || 0) + 1,
  //   masteredAt: percentage >= 80 ? new Date() : null,
  //   lastAttemptAt: new Date(),
  // };
  // await saveMastery(newMastery);

  // 4. Update learning DNA if significantly improved/declined
  // const improvement = percentage - (currentMastery?.score || 0);
  // if (improvement > 15 || improvement < -15) {
  //   await updateLearningDNA(studentId, schoolId, { ... });
  // }

  // 5. Recommend next topic
  // const nextTopic = await getNextRecommendedTopic(studentId, schoolId);
  // return nextTopic;

  return { score: percentage, masteredAt: percentage >= 80 };
}

// ============================================================================
// 11. TESTING UTILITIES
// ============================================================================

/**
 * Utility for testing: Create mock session data
 */
export function createMockSession(overrides = {}) {
  return {
    id: 'session-test-' + Math.random().toString(36).substr(2, 9),
    sessionType: 'ai_classroom_interactive' as const,
    studentId: 'student-test-123',
    schoolId: 'school-test-456',
    topicId: 'topic-test-789',
    difficultyLevel: 5,
    teachingStyle: 'friendly',
    duration: 1800,
    status: 'generated' as const,
    sceneData: {
      totalScenes: 5,
      scenes: [
        {
          id: 'scene-1',
          stageId: 'stage-1',
          type: 'slide' as const,
          title: 'Introduction',
          order: 0,
          actions: [],
        },
      ],
    },
    interactionData: {
      quizData: {
        quizzes: [],
        totalQuestions: 5,
        totalPoints: 10,
        totalAttempts: 0,
      },
      discussionLog: [],
      userResponses: [],
    },
    mediaData: {
      images: [],
      generatedAssets: [],
    },
    generatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {},
    ...overrides,
  };
}

/**
 * Utility: Demo flow
 */
export async function runDemo() {
  console.log('=== AI Classroom Integration Demo ===\n');

  // 1. Generate session
  console.log('1. Generating session...');
  const generateResponse = await exampleGenerateSession();
  console.log(`   ✓ Session: ${generateResponse.sessionId}\n`);

  // 2. Fetch session
  console.log('2. Fetching session...');
  // const session = await exampleGetSession(generateResponse.sessionId, 'school-456');
  // console.log(`   ✓ Scenes: ${session.sceneData.scenes.length}\n`);

  // 3. Get transcript
  console.log('3. Retrieving transcript...');
  // const transcript = await exampleGetTranscript(generateResponse.sessionId, 'school-456');
  // console.log(`   ✓ Word count: ${transcript.stats?.wordCount}\n`);

  // 4. Analytics
  console.log('4. Building analytics...');
  // const analytics = await exampleAnalytics('student-123', 'school-456');
  // console.log(`   ✓ Total sessions: ${analytics.totalSessions}\n`);

  console.log('=== Demo Complete ===');
}

export default {
  exampleGenerateSession,
  exampleGetSession,
  exampleSubmitQuiz,
  exampleLogInteraction,
  exampleGetTranscript,
  exampleErrorHandling,
  exampleAPIHandler,
  exampleDashboardSessions,
  exampleAnalytics,
  exampleUpdateMastery,
  createMockSession,
  runDemo,
};
