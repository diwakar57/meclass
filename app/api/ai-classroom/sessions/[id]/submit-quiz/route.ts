/**
 * API Route: POST /api/ai-classroom/sessions/[id]/submit-quiz
 * Submit quiz answers for a session
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import { createLogger } from '@/lib/logger';
import LearnAIIntegrationService from '@/lib/services/learnai-integration-service';
import type { SubmitQuizRequest } from '@/lib/types/ai-classroom';
import type { AuthContext } from '@/lib/types/auth';
import { notificationService } from '@/lib/services/notification-service';

const logger = createLogger('SubmitQuizAIClassroom');

export const POST = withRole(
  ['student'],
  async (
    req: NextRequest,
    auth: AuthContext,
    context?: { params?: { id?: string } } | Promise<{ params?: { id?: string } }>
  ) => {
  try {
    if (!auth.schoolId) {
      return NextResponse.json({ error: 'Missing tenant scope' }, { status: 401 });
    }
    const resolvedContext = context && typeof (context as Promise<any>).then === 'function'
      ? await (context as Promise<any>)
      : context;
    const sessionId = resolvedContext?.params?.id;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // 3. VERIFY SESSION OWNERSHIP
    const sessionData = await LearnAIIntegrationService.getSession(sessionId, auth.schoolId);
    if (!sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (sessionData.studentId !== auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized: cannot submit quiz for other students' },
        { status: 403 }
      );
    }

    // 4. PARSE & VALIDATE QUIZ REQUEST
    const body = await req.json() as Partial<SubmitQuizRequest>;

    if (!body.responses || !Array.isArray(body.responses)) {
      return NextResponse.json(
        { error: 'Invalid request: responses array required' },
        { status: 400 }
      );
    }

    // 5. HANDLE QUIZ SUBMISSION
    const result = await LearnAIIntegrationService.handleQuizSubmission(
      sessionId,
      auth.schoolId,
      body as SubmitQuizRequest
    );

    await notificationService.create({
      schoolId: auth.schoolId,
      userId: auth.userId,
      title: 'AI Session Quiz Completed',
      content: `You scored ${Math.round(result.percentage)}% in your AI session quiz.`,
      category: 'assessment',
      priority: result.percentage < 60 ? 'high' : 'medium',
      channels: ['in_app'],
      metadata: {
        sessionId,
        percentage: result.percentage,
      },
    }).catch(() => undefined);

    logger.info('Quiz submitted', {
      sessionId,
      score: result.quizScore,
      maxScore: result.maxScore,
      percentage: result.percentage,
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    logger.error('Failed to submit quiz', { error });

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('no quiz')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
});
